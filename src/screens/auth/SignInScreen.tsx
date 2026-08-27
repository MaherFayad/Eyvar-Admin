/**
 * Screen 1 — `signin` · `/signin`. Design §3.
 *
 * ```
 * ▣ Eyvar
 * Sign in
 * Eyvar operations console
 * [ BANNER SLOT — at most one, ever ]
 * Email        [ …                 ]
 * Password     [ …             ◉  ]
 * Forgot password?                     ← above the primary (AC-503, overruled)
 * ☐ Remember this device
 * [            Sign in             ]
 * Privacy  Terms
 * ```
 *
 * **The card is identical however the operator arrived.** An unauthenticated
 * deep link to `/financials/payouts` redirects here and the card says nothing
 * about it, even though **AC-501** still returns them there afterwards. The
 * reason is not aesthetic: the redirect target is an attacker-controllable URL
 * parameter, and rendering its title on an unauthenticated page is a
 * text-injection surface bought for no operator benefit (§3.1).
 *
 * ## The four states (§2.5)
 *
 * | State | Treatment |
 * |---|---|
 * | content | the card, fields empty or filled |
 * | **empty** | **not applicable** — an auth card holds no records. Recorded so nobody builds one (spec §9.1) |
 * | loading | the primary shows progress and keeps its label, is not re-triggerable; every text field goes **`readOnly`**; nothing unmounts |
 * | error | the §2.3 banner, `critical`, with `Try again` **inside** it. Identifier preserved, password cleared |
 *
 * Rules applied
 *   AC-502      an authenticated operator never sees this card — the redirect
 *               happens before it mounts.
 *   AC-504      a bad email format shows an inline error and issues **no
 *               network request**. The check is in `isPlausibleEmail`, so the
 *               same rule serves this screen and `/forgot-password`.
 *   AC-506/508  four different causes — unknown identifier, wrong password,
 *               `Suspended`, `Invited` — produce **byte-identical** copy,
 *               because they share one `AuthCondition` and one key.
 *   AC-507      after any rejection the identifier is kept and the password is
 *               cleared, and focus goes to the password field.
 *   AC-511      a transport failure keeps the identifier and clears the
 *               password, and offers a retry.
 *   AC-512      offline disables the primary **with the reason named**, and
 *               clears nothing. This is the one card state where disabling the
 *               primary is right, because there is genuinely no path.
 *   §3.2        `challenge-locked` leaves the primary **enabled** — disabling
 *               it would freeze the duration on screen forever, and **AC-528**
 *               requires it to fall on subsequent attempts.
 *   AC-580      no spinner without a resolution: every in-flight path ends in a
 *               named state.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { signIn } from '@/data/clients'
import { AuthBanner } from '@/components/auth/AuthBanner'
import { AUTH_BANNER_SLOT_ID, AuthCard } from '@/components/auth/AuthCard'
import { AuthCredentialForm } from '@/components/auth/AuthCredentialForm'
import {
  isPlausibleEmail,
  minutesUntil,
  resolveCondition,
  type AuthCondition,
} from '@/components/auth/authContract'
import { useOnline } from '@/hooks'
import { useShell } from '@/shell/ShellContext'
import { legalLinks } from './legal'
import { asSignInHandoff } from './flowState'

export function SignInScreen() {
  const shell = useShell()
  const t = shell.language.t
  const navigate = useNavigate()
  const location = useLocation()
  const online = useOnline()

  const handoff = asSignInHandoff(location.state)

  const [email, setEmail] = useState(handoff.email ?? '')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  /* The condition this attempt produced. Kept separate from the one the
     handoff carried, so a fresh rejection replaces the arrival banner and a
     retry does not resurrect it. */
  const [outcome, setOutcome] = useState<AuthCondition | null>(null)
  const [arrival, setArrival] = useState<AuthCondition | null>(handoff.condition ?? null)

  /* **AC-502** — an authenticated operator opening `/signin` is sent to their
     landing route **without the card rendering**. An effect would render one
     frame of it first, so this is a render-phase check with a `Navigate`
     below. */
  const authenticated = shell.session_lifecycle.status === 'authenticated'

  /* §3.2 — the operator is returned here after a fifth wrong code, after a
     reset, and after an expiry, each with its own banner. Design §2.3's
     precedence decides which one renders when two are true; there is never
     more than one. */
  const condition = resolveCondition([
    online ? null : ({ kind: 'offline', surface: 'signin' } as const),
    outcome,
    arrival,
  ])

  /* Focus the password field after a rejection (**AC-507**). A ref flag rather
     than an effect keyed on `outcome`, so a re-render for any other reason does
     not yank focus out of wherever the operator has moved it. */
  const passwordFocus = useRef(false)

  const submit = useCallback(async () => {
    /* **AC-504** — the format check runs first and short-circuits. No request
       is issued for `fahad@eyvar`, which is the criterion's actual assertion. */
    if (!isPlausibleEmail(email)) {
      setEmailError(t('auth.error.email'))
      return
    }
    setEmailError(null)
    setArrival(null)
    setOutcome(null)
    setBusy(true)
    try {
      const result = await signIn({ email, password, rememberDevice: remember })
      if (result.kind === 'challenge') {
        navigate('/signin/verify', {
          state: {
            challengeId: result.challengeId,
            secondFactor: result.secondFactor,
            expiresAt: result.expiresAt,
            resendAvailableAt: result.resendAvailableAt,
            origin: 'signin',
            from: handoff.from,
          },
        })
        return
      }
      if (result.kind === 'enrolment-required') {
        /* **AC-515** — no session is issued and there is no route out of
           enrolment except `Sign out`. */
        navigate('/signin/enroll', {
          state: {
            enrolmentToken: result.enrolmentToken,
            methods: result.methods,
            from: handoff.from,
          },
        })
        return
      }
      /* `failed`. The password is cleared and the identifier is kept
         (**AC-507**), and focus moves to the password field — announced by
         `role="alert"` without focus being stolen by the banner. */
      setPassword('')
      setOutcome(conditionForSignInFailure(result))
      passwordFocus.current = true
    } catch {
      /* **AC-511** — transport. Identifier kept, password cleared, retry
         offered inside the banner. The `catch` is unqualified on purpose: any
         throw from this seam is *the request did not complete*, because every
         domain answer arrives as a value. */
      setPassword('')
      setOutcome({ kind: 'transport-error', operation: 'auth.signIn' })
    } finally {
      setBusy(false)
    }
  }, [email, password, remember, navigate, t, handoff.from])

  useEffect(() => {
    if (!passwordFocus.current) return
    passwordFocus.current = false
    const field = document.querySelector<HTMLInputElement>('input[autocomplete="current-password"]')
    field?.focus()
  })

  /* **AC-502** — *"an authenticated operator opening `/signin` is sent to
     `session.landingRoute` **without rendering the sign-in card**"*. `Navigate`
     is a render-phase redirect: it returns `null` and schedules the navigation,
     so the card never mounts, not even for one frame. An effect would render
     one. */
  if (authenticated) {
    return <Navigate to={shell.session?.landingRoute ?? '/'} replace />
  }

  return (
    <AuthCard
      title={t('auth.signin.title')}
      subtitle={t('auth.signin.subtitle')}
      legal={legalLinks(t)}
      banner={
        <AuthBanner
          condition={condition}
          t={t}
          onRetry={condition?.kind === 'transport-error' ? submit : undefined}
        />
      }
    >
      <AuthCredentialForm
        mode="signin"
        t={t}
        email={email}
        onEmailChange={(next) => {
          setEmail(next)
          if (emailError) setEmailError(null)
        }}
        emailError={emailError}
        password={password}
        onPasswordChange={setPassword}
        revealed={revealed}
        onToggleReveal={() => setRevealed((current) => !current)}
        remember={remember}
        onRememberChange={setRemember}
        onForgotPassword={() =>
          /* **AC-513** — carrying whatever identifier was typed, pre-filled. */
          navigate('/forgot-password', { state: { email, from: handoff.from } })
        }
        onSubmit={() => void submit()}
        busy={busy}
        primaryLabel={t('auth.signin.submit')}
        /* **AC-512** — offline, and only offline, disables the primary here.
           `challenge-locked` deliberately does not: §3.2 says the primary stays
           enabled, because disabling it would freeze the duration on screen
           forever and **AC-528** requires it to fall. */
        primaryDisabled={!online}
        primaryDescribedBy={!online ? AUTH_BANNER_SLOT_ID : undefined}
      />
    </AuthCard>
  )
}

/**
 * `SignInOutcome` with `kind: 'failed'` → the designed condition.
 *
 * **`rejected` is one branch for four causes** — unknown identifier, wrong
 * password, `Suspended`, `Invited`. The distinctions exist in the fixtures and
 * are deliberately not on the wire (spec §4.5), which is what makes
 * **AC-506**, **AC-508** and **AC-578** true by construction rather than by
 * four call sites agreeing.
 *
 * > **`rate-limited` has no designed surface, and I have not invented one.**
 * > `SignInFailureReason` carries a third member the data layer added for
 * > `?mockFail=auth.signIn:429`. Design §3.2's state table does not name a
 * > rate-limited state and neither does spec §9.1 — the only mention of rate
 * > limiting anywhere is §7.2's *server* guarantee. It is rendered with the
 * > lockout's copy, because *"Too many attempts / Wait {minutes}, then sign in
 * > again."* is true of a 429 and the operator's next action is identical.
 * > **Reported to product-designer as a state with no design**, rather than
 * > given a sentence an engineer wrote.
 */
function conditionForSignInFailure(result: {
  reason: 'rejected' | 'locked' | 'rate-limited'
  lockedUntil: string | null
  retryAfter: string | null
}): AuthCondition {
  if (result.reason === 'locked') {
    return { kind: 'challenge-locked', minutes: minutesUntil(result.lockedUntil) }
  }
  if (result.reason === 'rate-limited') {
    return { kind: 'challenge-locked', minutes: minutesUntil(result.retryAfter) }
  }
  return { kind: 'credentials-rejected' }
}
