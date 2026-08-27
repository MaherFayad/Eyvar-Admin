/**
 * `AuthCredentialForm` — **the response to spec §7.3's two-mount-point cost.**
 *
 * Spec §7.3 flags that the sign-in surface must exist twice — as a route
 * outside `AppLayout`, and as a surface over a mounted, frozen app — and asks
 * the engineer to *respond rather than comply*. Design §8.1 is the response and
 * it is a **reduction, not a refusal**:
 *
 * > **One `<AuthCredentialForm>` with a `mode` prop, mounted twice.**
 * > One form, one validation path, one set of copy keys, two containers.
 * > **The guarantee is not dropped and nobody may drop it.**
 *
 * | | `mode="signin"` | `mode="reauth"` |
 * |---|---|---|
 * | Identifier | editable field | **fixed text, not a field** |
 * | `Remember this device` | present | absent — the device has not changed |
 * | `Forgot password?` | present | absent — a reset would kill this session **and the work with it** |
 * | Legal row | present (the card's) | absent |
 * | Container | the §2 auth card | the §8.2 modal body |
 * | Actions | a full-width primary, here | the modal's footer, passed in |
 *
 * # The identifier is absent in `reauth`, and that absence is the control
 *
 * Spec §7.6 requires that signing in as a *different* operator from this
 * surface be impossible, because a mounted app holding one operator's dirty
 * form must never be handed to another operator's session — that is `00c` **F5**
 * recreated in a new place. **A refusal is a check that can be forgotten. An
 * absent field cannot be.** So `mode="reauth"` does not render a disabled
 * identifier, or a read-only one, or one with `tabIndex={-1}`: it renders a
 * `<p>`. **AC-567 (a)** enumerates every focusable element inside the dialog and
 * fails on anything not on its list, and an `<input>` of any type other than
 * `password` fails outright — so the type of element here is load-bearing, not
 * stylistic.
 *
 * # Field order — AC-503 as overruled
 *
 * `Forgot password?` sits **directly under the password field, above the
 * primary** (design §1.3, spec §19.1 row 1). Two reference frames put it there
 * unambiguously, and the product reason is stronger than the reference one: it
 * is an escape from *the password*, not from the card, and it is the control an
 * operator reaches for in the second after the primary just failed. Below the
 * primary it reads as an afterthought and sits under the fold that a banner
 * re-render pushes down.
 *
 * Rules applied
 *   §2.5 / §8.1 **`readOnly`, never `disabled`,** on every text input while
 *               in flight or frozen. `AuthTextField` has no `disabled` prop, so
 *               this is structural rather than remembered.
 *   AC-509      one submission. `busy` disables the primary and makes `Enter`
 *               inert, so neither a double click nor a held `Enter` sends two.
 *   AC-504      the email format check runs **here, before any client call**,
 *               and a failure issues no network request.
 *   AC-679      `email` and `current-password` autocomplete, so a password
 *               manager fills the card without help.
 *   §13         tab order: email → password → reveal → `Forgot password?` →
 *               `Remember this device` → primary. DOM order is that order, so
 *               no `tabIndex` appears anywhere in this file.
 *   §7.4        `Remember this device` is **off by default**, and its helper
 *               sentence is the only place the operator is told they are
 *               weakening one factor for a month.
 */

import { useId, type FormEvent, type ReactNode } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import type { Translator } from '@/lib'
import { AuthPasswordField, AuthPlainButton, AuthPrimary, AuthTextField } from './AuthFields'
import { IsolatedValue } from './IsolatedValue'

export interface AuthCredentialFormProps {
  mode: 'signin' | 'reauth'
  t: Translator

  /** `signin`: the field's value. `reauth`: the account line's address. */
  email: string
  /** `signin` only. Absent in `reauth` because there is no field to change. */
  onEmailChange?: (value: string) => void
  /** **AC-504** — set by the caller after a failed format check. */
  emailError?: string | null

  password: string
  onPasswordChange: (value: string) => void
  revealed: boolean
  onToggleReveal: () => void

  /** `signin` only. Off by default (§7.4). */
  remember?: boolean
  onRememberChange?: (next: boolean) => void
  onForgotPassword?: () => void

  onSubmit: () => void
  /** **AC-509** — in flight. Fields go `readOnly`; the primary is not re-triggerable. */
  busy?: boolean
  /** §8.1's freeze, for the `reauth` mount. Same treatment, different cause. */
  frozen?: boolean
  /** The primary's label — `Sign in` in both modes, but the caller owns the key. */
  primaryLabel: string
  /** Disables the primary with a reason (`offline`, §3.2). */
  primaryDisabled?: boolean
  primaryDescribedBy?: string
  /**
   * `reauth` only: the modal's footer, rendered **inside the `<form>`** so its
   * primary can be `type="submit"` and `Enter` in the password field reaches it.
   * A footer outside the form would need a `form=` attribute or a click bridge,
   * and both are ways for `Enter` and the button to diverge.
   */
  footer?: ReactNode
}

export function AuthCredentialForm(props: AuthCredentialFormProps) {
  const { t, mode } = props
  const rememberId = useId()
  const rememberHelperId = `${rememberId}-helper`

  const readOnly = props.busy === true || props.frozen === true

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    /* AC-509 — a held `Enter` fires `submit` repeatedly; this is the second of
       the two gates (the first is the primary's own `disabled`). */
    if (readOnly) return
    props.onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      {mode === 'signin' ? (
        <AuthTextField
          label={t('auth.field.email')}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={props.email}
          onChange={props.onEmailChange ?? noop}
          error={props.emailError ?? null}
          readOnly={readOnly}
          describedBy={props.frozen ? FROZEN_REASON_ID : undefined}
        />
      ) : (
        /* **Not a field. Not a disabled field. A paragraph.** See the header:
           this is AC-567's mechanism, and it only works if there is no
           `<input>` here for anyone to re-enable — **AC-567 (a)** enumerates
           every focusable element in the dialog and fails on anything extra. */
        <IsolatedValue
          t={t}
          tKey="auth.reauth.signedInAs"
          name="email"
          value={props.email}
          ltr="email"
          className="text-sm text-muted-foreground"
        />
      )}

      <div className="flex flex-col gap-1">
        <AuthPasswordField
          label={t('auth.field.password')}
          autoComplete="current-password"
          value={props.password}
          onChange={props.onPasswordChange}
          revealed={props.revealed}
          onToggleReveal={props.onToggleReveal}
          showLabel={t('auth.field.showPassword')}
          hideLabel={t('auth.field.hidePassword')}
          readOnly={readOnly}
          describedBy={props.frozen ? FROZEN_REASON_ID : undefined}
        />

        {/* AC-503 as overruled — directly under the password field. Absent in
            `reauth`: a reset would kill this session and the unsaved work with
            it, which is the opposite of what the operator is here to do. */}
        {mode === 'signin' && props.onForgotPassword ? (
          <AuthPlainButton
            label={t('auth.signin.forgot')}
            onClick={props.onForgotPassword}
            disabled={readOnly}
          />
        ) : null}
      </div>

      {/* Absent in `reauth` — the device has not changed. */}
      {mode === 'signin' && props.onRememberChange ? (
        <div className="mt-1 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Checkbox
              id={rememberId}
              checked={props.remember ?? false}
              onCheckedChange={(next) => props.onRememberChange?.(next === true)}
              disabled={readOnly}
              aria-describedby={rememberHelperId}
            />
            <Label htmlFor={rememberId}>{t('auth.signin.remember')}</Label>
          </div>
          {/* §10.2 — a checkbox's helper indents to its LABEL, not to its box.
              `ms-6` is the 16 px box plus the 8 px gap. The sentence is not
              decoration: the operator is agreeing to weaken one factor for a
              month and this is the only place that is said (`copy.md` rule 7 —
              helper text, never a tooltip). */}
          <p id={rememberHelperId} className="ms-6 text-xs text-muted-foreground">
            {t('auth.signin.rememberHelper')}
          </p>
        </div>
      ) : null}

      {mode === 'signin' ? (
        <div className="mt-2">
          <AuthPrimary
            label={props.primaryLabel}
            busy={props.busy}
            disabled={props.primaryDisabled}
            describedBy={props.primaryDescribedBy}
          />
        </div>
      ) : (
        props.footer
      )}
    </form>
  )
}

/**
 * §8.1 — **one** visually-hidden reason element, referenced by
 * `aria-describedby` from every frozen control. Exported so the shell can
 * render it once and every frozen control can name it, and so there is exactly
 * one spelling of the id in the codebase.
 *
 * **AC-563** is explicit that a `title` attribute fails: it is hover-only, and
 * the criterion requires the reason to be available without a pointer.
 */
export const FROZEN_REASON_ID = 'session-expired-reason'

function noop() {}
