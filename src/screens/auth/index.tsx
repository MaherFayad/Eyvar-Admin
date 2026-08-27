/**
 * The six auth screens — design §3–§7.
 *
 * `reset-password` and `set-password` are **one component with a `purpose`
 * prop** (`NewPasswordCard`), because §7.4 is explicit that the second is *"the
 * §7.3 form, four strings changed"*. Two exports, one implementation, one
 * validation path — the same reduction `AuthCredentialForm` makes for the two
 * sign-in mount points.
 */

import { NewPasswordCard } from './NewPasswordCard'

export { SignInScreen } from './SignInScreen'
export { VerifyScreen } from './VerifyScreen'
export { EnrollScreen } from './EnrollScreen'
export { ForgotPasswordScreen } from './ForgotPasswordScreen'

/** Screen 5 — `/reset-password?token=…`. Design §7.3. */
export function ResetPasswordScreen() {
  return <NewPasswordCard purpose="reset" />
}

/** Screen 6 — `/activate?token=…`. Design §7.4. The `Invited → Active` transition. */
export function ActivateScreen() {
  return <NewPasswordCard purpose="activate" />
}
