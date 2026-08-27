/**
 * One `AuthCondition` in, **at most one banner** out — design §2.3.
 *
 * ## Why precedence and not a count
 *
 * 00-shell §4.2 merges two or more standing conditions into one banner carrying
 * a count (`2 conditions need your attention.`). **An auth card resolves by
 * precedence instead** (deviation **A-2**): it has at most two conditions, only
 * one of them is ever actionable, and *"2 conditions need your attention"* on a
 * sign-in screen is worse copy than the sentence it replaces. **R10's invariant
 * — one banner — is untouched**; what is suspended is §5.2's merge clause.
 *
 * The ladder, from `authContract.ts`:
 *
 * ```
 * 1  offline               nothing else can be acted on
 * 2  transport error       the request never reached the server
 * 3  challenge-locked      a timed wall; retrying now cannot work
 *    resend-exhausted
 * 4  domain rejection      actionable now
 * 5  informational         nothing is wrong
 * ```
 *
 * ## Red, checked against R5a before it was spent
 *
 * The failure banner is **use #2 — the one page-level critical banner** — not a
 * fifth use. On an auth screen the card *is* the page: no content region, no
 * rail, no second banner position, and by §2.3 exactly one banner can render.
 *
 * And the three non-counting code outcomes are deliberately **not** red:
 * `code-superseded` is `info` (nothing is wrong, nothing was consumed),
 * `code-expired` and `code-invalidated` are `warning` (a timer ran out; the
 * wrongness was already announced). **On the code screen, red means the attempt
 * counted** — that is the system the operator learns in one shift, and it only
 * works if nothing else is red. Colour is never the sole carrier: every one of
 * those states says so in words too (§7.5, WCAG 1.4.1).
 *
 * Rules applied
 *   R10 / §2.3  one banner, ever.
 *   R5a #2      `critical` is the page's one critical banner.
 *   AC-678      `role="alert"` for a rejection, `role="status"` for
 *               information — `conditionRole` decides, not the call site.
 *   §11.4       **no dismiss.** Every condition on an auth card is standing:
 *               it is true until the operator does something about it, and an
 *               operator must not be able to dismiss `You're offline`.
 *   §2.5        the transport error carries `Try again` **inside the banner**,
 *               which is where §2.5 puts it — not as a second page control.
 */

import { Banner, type BannerModel } from '@/components/Banner'
import type { Translator } from '@/lib'
import {
  conditionRole,
  conditionTone,
  type AuthCondition,
  type AuthOperationId,
} from './authContract'

export interface AuthBannerProps {
  condition: AuthCondition | null
  t: Translator
  /**
   * `Try again` — supplied only where a retry can help. A transport error gets
   * one; a wrong password does not, because the field is the retry.
   */
  onRetry?: () => void
}

export function AuthBanner({ condition, t, onRetry }: AuthBannerProps) {
  if (!condition) return null
  const model = bannerModel(condition, t, onRetry)
  return <Banner banner={model} variant="card" role={conditionRole(condition)} />
}

/**
 * The condition → copy map. Exported so a test can assert the strings without
 * a renderer, and so the four causes that must be **byte-identical**
 * (**AC-506**, **AC-508**, **AC-578**) provably share one branch.
 */
export function bannerModel(
  condition: AuthCondition,
  t: Translator,
  onRetry?: () => void,
): BannerModel {
  const tone = conditionTone(condition)
  const retry = onRetry ? [{ label: t('auth.tryAgain'), onClick: onRetry }] : undefined

  switch (condition.kind) {
    case 'offline':
      return {
        id: 'offline',
        tone,
        title: t('auth.offline.title'),
        body: t(`auth.offline.${condition.surface}`),
      }

    case 'transport-error':
      /* §2.5 — every transport error is `critical` with `Try again` inside the
         banner. The operation decides only the sentence. */
      return {
        id: `transport:${condition.operation}`,
        tone,
        title: t(transportTitleKey(condition.operation)),
        body: t(transportBodyKey(condition.operation)),
        actions: retry,
      }

    case 'challenge-locked':
      return {
        id: 'challenge-locked',
        tone,
        title: t('auth.lockout.title'),
        /* Plural family. The number NEVER ticks in the browser — it is re-read
           from the server per attempt, which is what lets **AC-528** see it
           fall. Contrast the resend cooldown (§4.4), which is an admitted
           courtesy and therefore may tick. */
        body: t.plural('auth.lockout.retryIn', { minutes: condition.minutes }),
      }

    case 'resend-exhausted':
      return {
        id: 'resend-exhausted',
        tone,
        title: t('auth.otp.exhausted.title'),
        body: t('auth.otp.exhausted.body'),
      }

    /* **AC-506 / AC-508 / AC-578 — one branch, four causes.** An unknown
       identifier, a wrong password, a `Suspended` account and an `Invited` one
       all arrive here and cannot diverge, because there is nowhere for them to
       diverge to. That is the enumeration guarantee as code rather than as a
       code review. */
    case 'credentials-rejected':
      return {
        id: 'credentials-rejected',
        tone,
        title: t('auth.error.credentials.title'),
        body: t('auth.error.credentials.body'),
      }

    /* This one MAY name the password, unlike the above: inside the re-auth
       modal the identity is fixed and displayed, so there is no enumeration to
       protect (§8.2). */
    case 'password-wrong':
      return {
        id: 'password-wrong',
        tone,
        title: t('auth.reauth.wrongPassword.title'),
        body: t('auth.reauth.wrongPassword.body'),
      }

    case 'account-cannot-sign-in':
      return {
        id: 'account-cannot-sign-in',
        tone,
        title: t('auth.reauth.blocked.title'),
        body: t('auth.reauth.blocked.body'),
      }

    case 'code-wrong':
      return {
        id: `code-wrong:${condition.attempt}`,
        tone,
        title: t('auth.otp.wrong.title'),
        /* §4.3 — attempt 2 names the consequence and attempt 1 does not.
           Telling an operator *"4 attempts left"* after one mistype is alarm
           without information; telling them *"one more cancels this code"* at
           the moment it becomes true is the only warning that changes what they
           do next. Not an enumeration oracle: they passed the password step, so
           their identity is already established. */
        body:
          condition.attempt === 1
            ? t('auth.otp.wrong.body')
            : condition.attempt === 2
              ? t('auth.otp.wrong2.body')
              : t('auth.otp.wrong4.body'),
      }

    case 'code-invalidated':
      return {
        id: 'code-invalidated',
        tone,
        title: t('auth.otp.invalidated.title'),
        body: t('auth.otp.invalidated.body'),
      }

    case 'code-superseded':
      return {
        id: 'code-superseded',
        tone,
        title: t('auth.otp.superseded.title'),
        body: t('auth.otp.superseded.body'),
      }

    case 'code-expired':
      return {
        id: 'code-expired',
        tone,
        title: t('auth.otp.expired.title'),
        body: t('auth.otp.expired.body'),
      }

    case 'challenge-completed-elsewhere':
      return {
        id: 'challenge-completed-elsewhere',
        tone,
        title: t('auth.otp.elsewhere.title'),
        body: t('auth.otp.elsewhere.body'),
      }

    /* §4.4 — the supersession trap closed BEFORE it springs. This fires the
       moment `Resend` succeeds, not after the operator has typed the older
       code. It costs one sentence and it prevents the failure spec §5.3
       identifies. */
    case 'code-resent':
      return {
        id: 'code-resent',
        tone,
        title: t('auth.otp.resent.title'),
        body: t('auth.otp.resent.body'),
      }

    case 'reset-requested':
      return {
        id: 'reset-requested',
        tone,
        title: t('auth.reset.requested.title'),
        body: t('auth.reset.requested.body'),
      }

    case 'reset-succeeded':
      return {
        id: 'reset-succeeded',
        tone,
        title: t('auth.reset.done.title'),
        /* The `#0` form names NO count, deliberately: `0 other sessions ended`
           is not a sentence anyone should ship (§7.5). One key, one plural
           rule, never two keys and never a concatenation (**AC-670**). */
        body: t.plural('auth.reset.done', { count: condition.endedSessions }),
      }

    case 'session-ended-idle':
      return {
        id: 'session-ended-idle',
        tone,
        title: t('auth.session.endedIdle.title'),
        body: t.plural('auth.session.endedIdle', { minutes: condition.minutes }),
      }

    case 'session-ended-absolute':
      return {
        id: 'session-ended-absolute',
        tone,
        title: t('auth.session.endedAbsolute.title'),
        body: t('auth.session.endedAbsolute.body'),
      }
  }
}

/**
 * Which sentence a transport failure gets. **Five distinct pairs**, because
 * *"nothing was sent"*, *"nothing was counted against your attempts"* and
 * *"your current code still works"* are three different facts and an operator
 * acts differently on each. **AC-535** and **AC-536** are exactly this
 * distinction; **AC-549** is the same idea for the reset request, where the
 * error must be visibly different from the non-committal confirmation.
 */
function transportTitleKey(operation: AuthOperationId): string {
  switch (operation) {
    case 'auth.verifyCode':
      return 'auth.error.verify.title'
    case 'auth.resendCode':
      return 'auth.error.resend.title'
    case 'auth.enrollSecondFactor':
      return 'auth.error.enroll.title'
    case 'auth.requestPasswordReset':
      return 'auth.error.forgot.title'
    case 'auth.validateResetToken':
      return 'auth.error.tokenCheck.title'
    case 'auth.resetPassword':
      return 'auth.error.reset.title'
    case 'auth.activateInvite':
      return 'auth.error.activate.title'
    case 'auth.reauthenticate':
      return 'auth.error.reauth.title'
    default:
      return 'auth.error.signin.title'
  }
}

function transportBodyKey(operation: AuthOperationId): string {
  switch (operation) {
    case 'auth.verifyCode':
      return 'auth.error.verify.body'
    case 'auth.resendCode':
      return 'auth.error.resend.body'
    case 'auth.enrollSecondFactor':
      return 'auth.error.enroll.body'
    case 'auth.requestPasswordReset':
      return 'auth.error.forgot.body'
    case 'auth.validateResetToken':
      return 'auth.error.tokenCheck.body'
    case 'auth.resetPassword':
      return 'auth.error.reset.body'
    case 'auth.activateInvite':
      return 'auth.error.activate.body'
    case 'auth.reauthenticate':
      return 'auth.error.reauth.body'
    default:
      return 'auth.error.signin.body'
  }
}
