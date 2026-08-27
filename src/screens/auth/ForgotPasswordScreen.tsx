/**
 * Screen 4 — `forgot-password` · `/forgot-password`. Design §6, §7.1, §7.2.
 *
 * One field, one primary, one route back (**AC-538**).
 *
 * ## The confirmation lands on `/signin`, not here
 *
 * `login-reset-link-sent-banner.webp` shows the banner on the login card with
 * the identifier still filled — **the reference returns you to sign-in**, and
 * under D14 that placement is structure, so it is kept. It is also the better
 * outcome: the operator's next act is in their mailbox, not on this screen, and
 * §6.3 deliberately keeps signing in normally from invalidating the link, so
 * returning them to the form that lets them do it is the point.
 *
 * **AC-540** is satisfied by the sign-in card's own banner slot (§2.3), which
 * sits between the subtitle and the identifier field.
 *
 * ## The confirmation is `info`, not `success`, and that is the decision
 *
 * The reference uses a green ✓. Under D14 the **placement** is Shopify's and
 * the **tone** is ours, and *success asserts that something happened* — which
 * is the exact claim this banner exists to refuse. A green tick over a
 * conditional sentence is a contradiction the operator reads faster than the
 * words.
 *
 * > **Two things the copy requires and cannot deliver alone, both server
 * > guarantees** (spec §11): identical wording **and identical timing** for a
 * > known and an unknown address, and per-identifier and per-source rate
 * > limiting. The mock honours the first — one outcome, one code path, one
 * > unconditional latency. **The copy is a promise the client cannot keep by
 * > itself**, and it is worth knowing that before shipping it.
 *
 * Rules applied
 *   AC-539      a known and an unknown address produce **byte-identical** copy.
 *               There is one outcome type, so there is nothing to diverge.
 *   AC-541      the copy contains none of *found*, *exists*, *no account*, and
 *               no holder's name.
 *   AC-504      a bad format shows the inline error and issues no request.
 *   AC-549      a transport failure is **visibly different** from the
 *               confirmation — a `critical` banner with a retry, here, rather
 *               than an `info` banner over there.
 */

import { useCallback, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { requestPasswordReset } from '@/data/clients'
import { AuthBanner } from '@/components/auth/AuthBanner'
import { AUTH_BANNER_SLOT_ID, AuthCard } from '@/components/auth/AuthCard'
import { AuthPlainButton, AuthPrimary, AuthTextField } from '@/components/auth/AuthFields'
import {
  isPlausibleEmail,
  resolveCondition,
  type AuthCondition,
} from '@/components/auth/authContract'
import { useOnline } from '@/hooks'
import { useShell } from '@/shell/ShellContext'
import { asSignInHandoff } from './flowState'
import { legalLinks } from './legal'

export function ForgotPasswordScreen() {
  const shell = useShell()
  const t = shell.language.t
  const navigate = useNavigate()
  const location = useLocation()
  const online = useOnline()

  /* **AC-513** — pre-filled with whatever was typed on `/signin`. */
  const handoff = asSignInHandoff(location.state)

  const [email, setEmail] = useState(handoff.email ?? '')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [condition, setCondition] = useState<AuthCondition | null>(null)

  const surfaceCondition = resolveCondition([
    online ? null : ({ kind: 'offline', surface: 'signin' } as const),
    condition,
  ])

  const submit = useCallback(async () => {
    if (!isPlausibleEmail(email)) {
      setEmailError(t('auth.error.email'))
      return
    }
    setEmailError(null)
    setCondition(null)
    setBusy(true)
    try {
      await requestPasswordReset(email)
      /* §7.1 — the confirmation lands on `/signin`, with the identifier still
         filled. `replace`, because `/forgot-password` is not somewhere an
         operator should be able to go Back to and submit a second time. */
      navigate('/signin', {
        replace: true,
        state: { email, condition: { kind: 'reset-requested' }, from: handoff.from },
      })
    } catch {
      /* **AC-549** — visibly different from the confirmation. */
      setCondition({ kind: 'transport-error', operation: 'auth.requestPasswordReset' })
    } finally {
      setBusy(false)
    }
  }, [email, navigate, t, handoff.from])

  return (
    <AuthCard
      title={t('auth.forgot.title')}
      subtitle={t('auth.forgot.subtitle')}
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
        <AuthTextField
          label={t('auth.field.email')}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(next) => {
            setEmail(next)
            if (emailError) setEmailError(null)
          }}
          error={emailError}
          readOnly={busy}
          autoFocus
        />
        <AuthPrimary
          label={t('auth.forgot.submit')}
          busy={busy}
          disabled={!online}
          describedBy={!online ? AUTH_BANNER_SLOT_ID : undefined}
        />
      </form>

      <div className="mt-4">
        {/* Verb-first (`copy.md` rule 2). `Back to sign in` is not, which is
            why it is not the string. */}
        <AuthPlainButton
          label={t('auth.forgot.return')}
          onClick={() => navigate('/signin', { state: { email, from: handoff.from } })}
        />
      </div>
    </AuthCard>
  )
}
