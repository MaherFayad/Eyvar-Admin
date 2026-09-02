/**
 * The verification-code field — design §4.1's seven decisions, **D-OTP-1** to
 * **D-OTP-7**.
 *
 * # ONE INPUT. NOT SIX BOXES.
 *
 * This is the single most likely thing for a later engineer to "improve", so
 * the reasons are here rather than in a document nobody opens:
 *
 * 1. **Paste works without a handler.** Six boxes need a paste interceptor on
 *    every box, and **AC-520 / AC-521** are exactly the cases that interceptor
 *    gets wrong.
 * 2. **`autocomplete="one-time-code"` works.** OS-level SMS autofill fills one
 *    field. It does not reliably fill six, and when it half-fills them the
 *    operator cannot tell.
 * 3. **Screen readers announce one labelled field with one value.** Six boxes
 *    announce as six unlabelled edit fields — *"edit text, blank"* six times —
 *    and the operator cannot review what they typed.
 * 4. **Backspace, arrows and selection are native.** In six boxes every one of
 *    those is hand-built and every one is subtly wrong somewhere.
 * 5. **RTL stops being a problem** (D-OTP-7).
 * 6. **The value can be read back.** `369867` in one field is one glance.
 * 7. **It is smaller**, and this card has one job.
 *
 * The reference agrees: `login-two-factor-authenticator-code.webp` and
 * `login-two-factor-code-entered.webp` both show a single field, and there is
 * no per-digit input anywhere in 159 frames.
 *
 * # Paste moves focus. Typing does not. (D-OTP-4)
 *
 * | Gesture | Result |
 * |---|---|
 * | Paste yielding exactly 6 digits | fills, **focus moves to the primary**, **nothing submits** |
 * | Paste yielding 1–5 digits | fills, focus stays in the field |
 * | Paste yielding > 6 digits | first 6 kept, rest dropped, focus moves to the primary |
 * | Typing the 6th digit | **focus does not move.** The caret stays |
 *
 * A paste is one atomic act whose whole result the operator can see, so handing
 * them the button is a favour. A typist's next keystroke after the 6th digit
 * would land on the button, where `Space` or `Enter` submits a code they have
 * not read. **There is no auto-submit at all**: not auto-submitting costs one
 * keystroke; auto-submitting costs a consumed attempt on a screen where the
 * fifth costs fifteen minutes.
 *
 * # Centred, `dir="ltr"`, and that is the RTL answer. (D-OTP-7)
 *
 * Spec §12.4 calls this *"the single most likely RTL defect on this surface"*.
 * A 6-digit run in a 336 px field aligned to either edge looks deliberate in
 * one language and broken in the other; **centre has no direction at all**, so
 * English and Arabic render identically and **AC-537 / AC-674 pass by
 * construction rather than by care**. `dir="ltr"` pins the digit order, which
 * is `rtl.md`'s numeral-run rule applied. Recorded as deviation **A-3** — a
 * one-field exception to §4.2's inline-start value alignment.
 *
 * # No placeholder. (D-OTP-3)
 *
 * The reference shows `000000`. **Overruled** (deviation A-4): at 17 px tabular
 * in a 336 px field, six zeros are indistinguishable from a filled value, and
 * *"is that my code or theirs?"* is the exact confusion this screen cannot
 * afford. The helper text carries the format instead.
 *
 * # Label above, not inset. (D-OTP-2)
 *
 * §4.2 records an inset/floating label *"(auth surface only)"* from this exact
 * frame. **Not adopted** (deviation A-5): it exists in Shopify's auth and
 * nowhere else in their admin, and it forces a second field anatomy in a
 * product that has exactly one.
 */

import { type ClipboardEvent, type RefObject } from 'react'
import {
  Field,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { OTP_LENGTH, sanitiseCode } from './authContract'

export interface OtpFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  helper: string
  error?: string | null
  /**
   * **`readOnly`, never `disabled`** — §2.5's in-flight rule and §4.3's
   * cancelled-code rule both land here, and both need the digits to stay
   * readable. There is no `disabled` prop on this field for the same reason
   * there is none on `AuthTextField`.
   */
  readOnly?: boolean
  /**
   * Where focus goes after a paste that fills the field. **D-OTP-4** — the
   * primary, and nothing is submitted. `null` is legitimate (the re-auth
   * modal's footer primary may not be mounted yet); focus then simply stays.
   */
  primaryRef?: RefObject<HTMLButtonElement | null>
  autoFocus?: boolean
}

export function OtpField({
  label,
  value,
  onChange,
  helper,
  error,
  readOnly,
  primaryRef,
  autoFocus = true,
}: OtpFieldProps) {
  /**
   * **D-OTP-5 — non-digits are rejected at input time, so the keystroke never
   * lands** (**AC-518**). Not "shown as an error afterwards": a letter that
   * appears and is then removed is a field arguing with the operator.
   *
   * This also catches the *typed* Arabic-Indic digit, because `sanitiseCode`
   * folds through `toLatinDigits` before it strips.
   */
  function handleChange(next: string) {
    onChange(sanitiseCode(next))
  }

  /**
   * The paste path. It is intercepted rather than left to `onChange` for one
   * reason: **the focus move must depend on what the paste yielded**, and by
   * the time `onChange` fires the browser has already merged the paste with
   * whatever was in the field, so a 6-digit paste into a field holding `1` is
   * indistinguishable from typing.
   */
  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    if (readOnly) return
    const pasted = event.clipboardData.getData('text')
    const digits = sanitiseCode(pasted)
    /* A paste with no digits in it is not a paste of a code; let the browser
       do whatever it would have done, which `handleChange` then sanitises. */
    if (digits.length === 0) return

    event.preventDefault()
    onChange(digits)

    /* Exactly the D-OTP-4 rule. `sanitiseCode` has already truncated to 6, so
       "yielded more than 6" and "yielded exactly 6" are the same test here —
       which is correct: both hand the operator the button. */
    if (digits.length === OTP_LENGTH) {
      /* After the state commit, not during it: the button may be `disabled`
         until the field is full, and a disabled element cannot take focus. */
      queueMicrotask(() => primaryRef?.current?.focus())
    }
  }

  return (
    <Field invalid={Boolean(error)}>
      <FieldLabel>{label}</FieldLabel>
      <FieldControl>
        <Input
          value={value}
          onChange={(event) => handleChange(event.target.value)}
          onPaste={handlePaste}
          readOnly={readOnly}
          /* D-OTP-6, verbatim. `dir="ltr"` is unconditional — in both languages. */
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          maxLength={OTP_LENGTH}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          dir="ltr"
          autoFocus={autoFocus}
          /* D-OTP-7 — 40 px field, 17/24 tabular, CENTRED. `tabular-nums` keeps
             the six glyphs on a fixed advance so the run does not shuffle as the
             operator types, and `tracking-wide` separates them without the
             per-digit boxes this field exists to avoid. */
          className="h-control-lg text-center text-lg tabular-nums tracking-wide"
        />
      </FieldControl>
      <FieldDescription>{helper}</FieldDescription>
      <FieldError>{error}</FieldError>
    </Field>
  )
}
