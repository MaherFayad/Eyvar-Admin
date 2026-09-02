/**
 * The auth card's field vocabulary — design §2.2, §4.1, §7.3.
 *
 * Six screens share one field anatomy, so it is declared once here rather than
 * six times in six screens. Every one of these is **presentational**: it takes
 * a value and a handler and knows nothing about a client.
 *
 * ## The two rules that this whole file exists to enforce
 *
 * **1. `readOnly`, NEVER `disabled`, on every text input in every frozen or
 * in-flight state** (§2.5, §8.1, handoff item 2). A `disabled` input greys its
 * value and drops out of some assistive-technology trees, which loses the
 * operator the one thing the freeze exists to protect. **AC-562**, **AC-563**
 * and **AC-586** all fail on this single detail, and the design names it as the
 * most likely defect in the document. So `AuthTextField` has **no `disabled`
 * prop at all** — the type is the enforcement, not the review. The one place
 * disabling a control is right is a *button*, which cannot hold a value.
 *
 * **2. Field height is `--ev-control-h-lg` (40 px), not the 32 px compact
 * control** (§2.2, deviation A-9). This is the token's declared job and its
 * first consumer. §4.2's *one field height per surface* is honoured — every
 * field on the card is 40. It steps to 44 in Arabic from `globals.css`, with
 * nothing to do here.
 *
 * Rules applied
 *   §10.2       label ABOVE the field, 13/400 `--ev-ink`. A placeholder is
 *               never a label (§7.4.5); the only placeholder in these six
 *               screens is `+966 5X XXX XXXX`, a genuine format example.
 *   §10.2       helper text BELOW the control, 12 px `--ev-text-2`.
 *               Constraints and consequences live in helper text, never in a
 *               tooltip (`copy.md` rule 7).
 *   §10.4/D-14  the inline field error is **two signals**: a 1 px `--ev-red`
 *               border and a 12 px `--ev-red` message with a filled
 *               circle-exclamation glyph. **No `--ev-red-lt` fill** — design
 *               §16.1, and it is what the codebase already does. A fill would
 *               paint the same plate as the critical banner §4.4 puts on screen
 *               at the same time, so the summary and the items would be one
 *               surface.
 *
 *               **`AuthFieldError` is gone (doc 14 G7).** Its treatment is now
 *               `ui/field.tsx`'s `FieldError` and this file consumes the shared
 *               one. The comment that used to sit here said the duplicate
 *               existed because "three other screens are being built against
 *               `FieldError` right now"; that was checked before acting on it
 *               and `ui/field` had **zero** consumers, so nothing could be
 *               regressed. Auth's treatment won on the merits, not by seniority.
 *   AC-678      the error is `aria-describedby` from its field, with
 *               `aria-invalid="true"`, so it is announced and not merely drawn.
 *   AC-679      `autocomplete` on all four field kinds, so a password manager
 *               fills the card without help.
 *   §7.2        every interactive element has a visible focus ring. `Button`
 *               and `Input` carry theirs; the reveal control inherits
 *               `Button`'s.
 *   R6          full sentences take a period; labels and titles do not.
 */

import { type ReactNode, type Ref } from 'react'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { EyeIcon, EyeOffIcon } from 'lucide-react'

/* ─────────────────────────────── the text field ──────────────────────────── */

export interface AuthTextFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  /** `email` · `current-password` · `new-password` · `one-time-code` · `tel`. **AC-679**. */
  autoComplete: string
  type?: 'text' | 'email' | 'tel'
  /**
   * **The only way to make this field inert.** There is no `disabled` prop, by
   * design — see the file header. A read-only field keeps its value on screen,
   * selectable, copyable and in the AT tree.
   */
  readOnly?: boolean
  /** A genuine format example only. Never a substitute for the label. */
  placeholder?: string
  /** 12 px under the control. Present at mount where the policy is a precondition. */
  helper?: ReactNode
  /** The inline error's sentence, or `null`. Drives `aria-invalid` too. */
  error?: string | null
  autoFocus?: boolean
  /** For the freeze: `aria-describedby` → the one `session-expired-reason` element. */
  describedBy?: string
  inputMode?: 'text' | 'numeric' | 'tel' | 'email'
  dir?: 'ltr'
  className?: string
  id?: string
}

export function AuthTextField(props: AuthTextFieldProps) {
  return (
    <Field id={props.id} invalid={Boolean(props.error)} className={cn(props.className)}>
      <FieldLabel>{props.label}</FieldLabel>
      <FieldControl>
        <Input
          type={props.type ?? 'text'}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          readOnly={props.readOnly}
          placeholder={props.placeholder}
          autoComplete={props.autoComplete}
          autoFocus={props.autoFocus}
          inputMode={props.inputMode}
          dir={props.dir}
          aria-describedby={props.describedBy}
          /* §2.2 — 40 px, the one field height on this surface (A-9). */
          className="h-control-lg"
        />
      </FieldControl>
      {props.helper ? <FieldDescription>{props.helper}</FieldDescription> : null}
      <FieldError>{props.error}</FieldError>
    </Field>
  )
}

/* ───────────────────────────── the password field ────────────────────────── */

export interface AuthPasswordFieldProps
  extends Omit<AuthTextFieldProps, 'type' | 'inputMode' | 'dir'> {
  revealed: boolean
  onToggleReveal: () => void
  showLabel: string
  hideLabel: string
}

/**
 * The reveal control — §2.2, **AC-510**.
 *
 * `type="button"`, so `Enter` inside the field submits the card's primary and
 * **never toggles the reveal** (**AC-509**, §13). 32 px hit target inside the
 * 40 px field, at the inline-end, keyboard-operable, with an accessible name
 * that changes with the state rather than an `aria-pressed` on a static one —
 * `Show password` / `Hide password` is what the design names.
 *
 * Built from `Input` plus an absolutely positioned `Button` rather than from
 * `InputGroup`: `InputGroup` is `h-8` and re-declares the focus ring on the
 * *group*, so a 40 px auth field would have to override both, and the ring
 * would then sit around the group instead of the control the operator is in.
 * Two overrides against one is not a saving.
 */
export function AuthPasswordField(props: AuthPasswordFieldProps) {
  return (
    <Field id={props.id} invalid={Boolean(props.error)} className={cn(props.className)}>
      <FieldLabel>{props.label}</FieldLabel>
      <div className="relative">
        <FieldControl>
          <Input
            type={props.revealed ? 'text' : 'password'}
            value={props.value}
            onChange={(event) => props.onChange(event.target.value)}
            readOnly={props.readOnly}
            autoComplete={props.autoComplete}
            autoFocus={props.autoFocus}
            aria-describedby={props.describedBy}
            /* `pe-10` leaves the 32 px control plus its inset clear of the value
               in both directions — logical, so it mirrors. */
            className="h-control-lg pe-10"
          />
        </FieldControl>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={props.onToggleReveal}
          aria-label={props.revealed ? props.hideLabel : props.showLabel}
          /* Centred in the 40 px field at the inline-end. `end-1` and
             `-translate-y-1/2` are both logical / axis-neutral. */
          className="absolute end-1 top-1/2 -translate-y-1/2"
        >
          {props.revealed ? <EyeOffIcon /> : <EyeIcon />}
        </Button>
      </div>
      {props.helper ? <FieldDescription>{props.helper}</FieldDescription> : null}
      <FieldError>{props.error}</FieldError>
    </Field>
  )
}

/* ───────────────────────────── the full-width primary ────────────────────── */

export interface AuthPrimaryProps {
  label: string
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  /** **AC-509** — while this is true the control cannot be triggered again. */
  busy?: boolean
  /** Points at the banner that explains why it is disabled (**AC-512**). */
  describedBy?: string
  /**
   * **D-OTP-4's landing spot.** A paste that fills the code field moves focus
   * here, **without submitting**. Named `buttonRef` rather than `ref` because
   * this is a composition, not a `<button>` wearing a different name, and a
   * prop called `ref` on a component that is not forwarding one is the kind of
   * thing that reads as working until somebody tries `useImperativeHandle`.
   */
  buttonRef?: Ref<HTMLButtonElement>
}

/**
 * §2.2 — **full width, 40 px, one per card, always.** `bg-primary` is
 * `--ev-ink` under D7 §1.8; there is no blue primary anywhere in this product.
 *
 * **The busy state keeps its label** (§2.5). A spinner that replaces the words
 * leaves the operator unable to tell which of two buttons they pressed, and the
 * label is the only thing on screen that says what is in flight.
 */
export function AuthPrimary({
  label,
  onClick,
  type = 'submit',
  disabled,
  busy,
  describedBy,
  buttonRef,
}: AuthPrimaryProps) {
  return (
    <Button
      ref={buttonRef}
      type={type}
      variant="default"
      size="lg"
      onClick={onClick}
      /* **AC-509** — not re-triggerable by click, by `Enter`, or by a double
         submit. `disabled` on a button is right: a button holds no value, so
         none of §2.5's `readOnly` reasoning applies to it. */
      disabled={disabled || busy}
      aria-describedby={describedBy}
      className="w-full"
    >
      {/* **No name, deliberately.** `spinner.tsx` is now decorative unless it
          is given one, and this is the call site that wanted that: an
          accessible name inside a button **folds into the button's own**, so a
          named spinner renamed `Sign in` to "Sign in Loading" the instant it
          went in flight — in English, on a card with no other English on it in
          Arabic (**AC-669**). The label beside it is what announces, and it is
          already a key. */}
      {busy ? <Spinner /> : null}
      {label}
    </Button>
  )
}

/**
 * The card's small escape — `Use a different account`, `Return to sign in`,
 * `Sign out`, `Use a different method`.
 *
 * A real `<button>`, never a `<div>` with an `onClick`: the legacy app has 253
 * non-focusable click handlers and this is not the 254th (§7.4).
 */
export function AuthPlainButton({
  label,
  onClick,
  disabled,
  size = 'sm',
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  /** `sm` is 13 px (§6's `Return to sign in`); `xs` is 12 px (§4.2's escape). */
  size?: 'sm' | 'xs'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-fit rounded-sm text-info-foreground underline underline-offset-4 outline-none hover:no-underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:pointer-events-none disabled:opacity-50',
        size === 'sm' ? 'text-sm' : 'text-xs',
      )}
    >
      {label}
    </button>
  )
}
