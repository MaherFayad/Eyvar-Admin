/**
 * Screens 5 and 6 — `reset-password` · `/reset-password?token=…` and
 * `set-password` · `/activate?token=…`. Design §7.3, §7.4.
 *
 * §7.4 is explicit: *"the §7.3 form, four strings changed."* So it is **one
 * component with a `purpose` prop**, for exactly the reason `AuthCredentialForm`
 * is one component with a `mode` prop — one validation path, one strength
 * meter, one breach-rejection path, one set of keys, two callers.
 *
 * ```
 * ▣ Eyvar
 * Choose a new password
 * For fahad@eyvar.com                  ← <bdi dir="ltr">
 * [ BANNER SLOT ]
 * New password      [ ••••••••    ◉ ]
 * ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬   ← 4px meter
 * Password strength: strong
 * At least 12 characters. Longer is better than more complicated.
 * Confirm new password [ ••••••••  ◉ ]
 * [          Reset password         ]
 * ```
 *
 * ## The mount-time load is a skeleton, not a spinner
 *
 * **AC-654** / §2.5: the token is validated before the form is usable, and that
 * wait renders as **a skeleton shaped like the form** — two label/field pairs
 * and a button bar — never a centred spinner. A spinner says *"something is
 * happening"*; a skeleton says *"a form is coming, and this is its shape"*, and
 * on a card whose next state might be *"this link is dead"* that difference is
 * the operator's first real information.
 *
 * ## One state for all four invalid-token causes
 *
 * Unknown, used, superseded, expired — **the same card**, because
 * distinguishing them tells a link-holder which kind of link they are holding
 * (**AC-543**, **AC-544**). And the whole card is replaced rather than
 * bannered: a banner above an absent form is nonsense.
 *
 * ## The token never appears on screen
 *
 * **AC-591**. There is no copy-link affordance. It stays in the URL because it
 * must survive a refresh, and after a successful reset the app does a
 * `history.replace` to `/signin` so a spent token does not sit in the address
 * bar.
 *
 * Rules applied
 *   AC-545      the policy is visible **before** the operator types — helper
 *               text under field 1, present at mount.
 *   AC-546      under 12 characters cannot be submitted, and the reason names
 *               the minimum.
 *   AC-547      a mismatch is shown under **field 2**, not as a toast, and the
 *               primary cannot be submitted while it stands.
 *   AC-548      a breach rejection is an inline error under field 1 **after
 *               submission**, and both fields keep their contents.
 *   AC-550      a token-validation transport failure renders the form with a
 *               `critical` banner and a retry — explicitly **not** the
 *               invalid-link state.
 *   AC-551      a submit failure keeps both values.
 *   §7.3        the meter **never gates submission**. Only the minimum, the
 *               match and the breach list do.
 */

import { useCallback, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { activateInvite, resetPassword, validateResetToken } from '@/data/clients'
import type { ValidateTokenOutcome } from '@/data/types/auth'
import { AuthBanner } from '@/components/auth/AuthBanner'
import { AUTH_BANNER_SLOT_ID, AuthCard, AuthCardReplacement } from '@/components/auth/AuthCard'
import { AuthPasswordField, AuthPrimary } from '@/components/auth/AuthFields'
import { IsolatedValue } from '@/components/auth/IsolatedValue'
import { StrengthMeter } from '@/components/auth/StrengthMeter'
import {
  PASSWORD_MIN_LENGTH,
  passwordStrength,
  resolveCondition,
  type AuthCondition,
} from '@/components/auth/authContract'
import { Skeleton } from '@/components/ui/skeleton'
import { useAsync, useOnline } from '@/hooks'
import { useShell } from '@/shell/ShellContext'
import { ROLE_KEYS } from './copy'
import { legalLinks } from './legal'

export type NewPasswordPurpose = 'reset' | 'activate'

export function NewPasswordCard({ purpose }: { purpose: NewPasswordPurpose }) {
  const shell = useShell()
  const t = shell.language.t
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const online = useOnline()

  const token = params.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [revealPassword, setRevealPassword] = useState(false)
  const [revealConfirm, setRevealConfirm] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [condition, setCondition] = useState<AuthCondition | null>(null)
  /** A token the *server* rejected on submit, after it validated on mount. */
  const [tokenDied, setTokenDied] = useState(false)

  /* **AC-544** — no `token` parameter renders the invalid-link state, not an
     empty form. The read is skipped rather than fired with `''`, because a
     request that cannot succeed is a request that should not be made. */
  const check = useAsync<ValidateTokenOutcome>(
    (signal) => validateResetToken(token ?? '', signal),
    { deps: [token], enabled: token !== null },
  )

  const strength = passwordStrength(password)

  const submit = useCallback(async () => {
    if (token === null) return
    /* **AC-546** and **AC-547** are checked here and gate the primary, which
       is why the button is also `disabled` below: §11.2 of foundation — *gate
       at render, not at commit*. The check here is the second gate, for the
       `Enter` key and for a paste that changes both fields at once. */
    if (password.length < PASSWORD_MIN_LENGTH) {
      setPasswordError(t('auth.reset.tooShort'))
      return
    }
    if (password !== confirm) {
      setConfirmError(t('auth.reset.mismatch'))
      return
    }
    setPasswordError(null)
    setConfirmError(null)
    setCondition(null)
    setBusy(true)
    try {
      const result =
        purpose === 'activate'
          ? await activateInvite({ token, password })
          : await resetPassword({ token, password })

      if (result.kind === 'failed') {
        /**
         * **AC-548 — the server refused the password, not the link.**
         *
         * An **inline error under field 1**, and **both fields keep their
         * contents**: the operator has to change one of them, and clearing what
         * they typed would make them retype a password they are about to be
         * told is fine. `auth.reset.breached` was keyed and unreachable until
         * `ResetPasswordOutcome` gained this reason.
         *
         * It is deliberately **not** the invalid-link card below: the link is
         * fine. Folding a breach rejection into the four token states would
         * throw the operator out of a form they can still finish.
         */
        if (result.reason === 'breached') {
          setPasswordError(t('auth.reset.breached'))
          return
        }
        /* The token died between the mount check and the submit — used in
           another tab, or superseded by a second request. Same one state as
           every other invalid cause (**AC-543**). */
        setTokenDied(true)
        return
      }

      if (purpose === 'activate') {
        /* §7.4 — **an activation does not sign anyone in.** The operator
           continues to enrolment, then the code, then the session, then the
           onboarding layer auto-opens (**AC-555**, **AC-593**). They arrive at
           `/signin` and sign in with the password they just set. */
        navigate('/signin', { replace: true })
        return
      }

      /* §7.5 — R10's paired case: the action completed **and** left a next
         step, so a `success` banner on `/signin` rather than a toast.
         `replace`, so a spent token does not sit in the address bar
         (**AC-591**). */
      navigate('/signin', {
        replace: true,
        state: {
          condition: { kind: 'reset-succeeded', endedSessions: result.otherSessionsEnded },
        },
      })
    } catch {
      /* **AC-551** / **AC-556** — both fields keep their values. */
      setCondition({
        kind: 'transport-error',
        operation: purpose === 'activate' ? 'auth.activateInvite' : 'auth.resetPassword',
      })
    } finally {
      setBusy(false)
    }
  }, [token, password, confirm, purpose, navigate, t])

  /* ── the whole-card replacements ──────────────────────────────────────── */

  /* `content` **or** `empty`: `useAsync` classifies by `defaultIsEmpty`, and a
     resolved-but-empty read is still a resolved read. Checking only `content`
     would let an unclassified shape fall through to the form with no token. */
  const resolved = check.status === 'content' || check.status === 'empty'
  const invalidToken =
    token === null || tokenDied || (resolved && check.data?.state !== 'valid')

  if (invalidToken) {
    return purpose === 'activate' ? (
      <AuthCardReplacement
        title={t('auth.activate.tokenInvalid.title')}
        body={t('auth.activate.tokenInvalid.body')}
        action={{
          label: t('auth.activate.tokenInvalid.action'),
          onClick: () => navigate('/signin', { replace: true }),
          /* §7.4 — a **plain** button here, not a primary: the operator has
             nothing to do on this card, and `Go to sign in` is an exit rather
             than the action the card exists for. */
          emphasis: 'plain',
        }}
        legal={legalLinks(t)}
      />
    ) : (
      <AuthCardReplacement
        title={t('auth.reset.tokenInvalid.title')}
        body={t('auth.reset.tokenInvalid.body')}
        action={{
          label: t('auth.reset.tokenInvalid.action'),
          onClick: () => navigate('/forgot-password', { replace: true }),
        }}
        legal={legalLinks(t)}
      />
    )
  }

  /* ── the card ─────────────────────────────────────────────────────────── */

  const loading = check.status === 'loading'
  /* **AC-550** — a transport failure on the token check renders the form with
     a `critical` banner and a retry, and is explicitly **not** the invalid-link
     state. The form is inert while it stands: `readOnly`, never `disabled`. */
  const checkFailed = check.status === 'error'

  const surfaceCondition = resolveCondition([
    online ? null : ({ kind: 'offline', surface: 'signin' } as const),
    checkFailed
      ? ({ kind: 'transport-error', operation: 'auth.validateResetToken' } as const)
      : null,
    condition,
  ])

  /**
   * Two subtitles, one per purpose.
   *
   * **§7.4** — `You've been invited to Eyvar as {role}.` on the activation
   * card. `{role}` is **itself a key** (`role.opsManager`), never an English
   * literal interpolated into Arabic: `ValidateTokenOutcome` sends the domain
   * value and this keys it. That indirection is the whole point — an Arabic
   * dictionary translates `role.opsManager`, and it cannot translate a string
   * that arrived already spelled.
   *
   * **§7.3** — `For fahad@eyvar.com` on the reset card, in a
   * `<bdi dir="ltr">` (**AC-675**).
   *
   * `role` is `null` on a reset token by design, so an activation that somehow
   * arrives without one falls back to the account line rather than rendering a
   * sentence with a hole where the role should be.
   */
  const email = loading || checkFailed ? null : (check.data?.email ?? null)
  const role = loading || checkFailed ? null : (check.data?.role ?? null)

  const accountLine =
    email === null ? null : (
      <IsolatedValue
        t={t}
        tKey="auth.reset.forAccount"
        name="email"
        value={email}
        ltr="email"
        as="span"
      />
    )

  const subtitle =
    purpose === 'activate' && role !== null
      ? t('auth.activate.subtitle', { role: t(ROLE_KEYS[role] ?? 'role.support') })
      : accountLine

  const canSubmit =
    password.length >= PASSWORD_MIN_LENGTH && password === confirm && online && !checkFailed

  return (
    <AuthCard
      title={purpose === 'activate' ? t('auth.activate.title') : t('auth.reset.title')}
      subtitle={subtitle}
      legal={legalLinks(t)}
      banner={
        <AuthBanner
          condition={surfaceCondition}
          t={t}
          onRetry={
            surfaceCondition?.kind === 'transport-error'
              ? surfaceCondition.operation === 'auth.validateResetToken'
                ? check.refetch
                : () => void submit()
              : undefined
          }
        />
      }
    >
      {loading ? (
        <FormSkeleton />
      ) : (
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <div>
            <AuthPasswordField
              label={
                purpose === 'activate' ? t('auth.field.password') : t('auth.reset.newPassword')
              }
              autoComplete="new-password"
              value={password}
              onChange={(next) => {
                setPassword(next)
                if (passwordError) setPasswordError(null)
                if (confirmError && next === confirm) setConfirmError(null)
              }}
              revealed={revealPassword}
              onToggleReveal={() => setRevealPassword((current) => !current)}
              showLabel={t('auth.field.showPassword')}
              hideLabel={t('auth.field.hidePassword')}
              readOnly={busy || checkFailed}
              error={passwordError}
              autoFocus
            />
            <StrengthMeter strength={strength} caption={t(`auth.reset.strength.${strength}`)} />
            {/* **AC-545** — present at mount, before anything is typed. The
                second clause is doing real work: it is what stops an operator
                producing `Password1!` and believing they complied. */}
            <p className="mt-1 text-xs text-muted-foreground">{t('auth.reset.policy')}</p>
          </div>

          <AuthPasswordField
            label={t('auth.reset.confirmPassword')}
            autoComplete="new-password"
            value={confirm}
            onChange={(next) => {
              setConfirm(next)
              if (confirmError) setConfirmError(null)
            }}
            revealed={revealConfirm}
            onToggleReveal={() => setRevealConfirm((current) => !current)}
            showLabel={t('auth.field.showPassword')}
            hideLabel={t('auth.field.hidePassword')}
            readOnly={busy || checkFailed}
            error={confirmError}
          />

          <AuthPrimary
            label={purpose === 'activate' ? t('auth.activate.submit') : t('auth.reset.submit')}
            busy={busy}
            disabled={!canSubmit}
            describedBy={!online ? AUTH_BANNER_SLOT_ID : undefined}
          />
        </form>
      )}
    </AuthCard>
  )
}

/**
 * **AC-654** — *"a skeleton shaped like the form (two label/field pairs + a
 * button bar), never a centred spinner."*
 *
 * The shape is the point. Every bar below corresponds to something that is
 * about to be in its place, so the card does not resize when the real form
 * lands and the operator's eye does not have to re-find the first field.
 */
function FormSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      {[0, 1].map((row) => (
        <div key={row} className="flex flex-col gap-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-control-lg w-full" />
        </div>
      ))}
      <Skeleton className="h-control-lg w-full" />
    </div>
  )
}
