/**
 * A countdown to a **server-issued deadline** — the resend cooldown, and only
 * things shaped like it.
 *
 * design/08-auth-and-onboarding.md §4.4, the resend row:
 *
 * > **Schedule** 30 s → 60 s → 120 s per challenge.
 * > **Tick** Once per second, in the browser. This is an admitted **courtesy** —
 * > the server enforces the cooldown regardless — which is exactly why it *may*
 * > tick, unlike the lockout minutes in §3.2, which may not.
 *
 * ## Read this before adding a second countdown
 *
 * **There is no client-side lockout counter and there must never be one.**
 * §3.2's `Wait {minutes} minutes, then sign in again.` is re-read from the
 * server on every attempt and **does not tick in the browser**. The two look
 * identical on screen and are opposites underneath: the cooldown is a courtesy
 * over a fact the server will enforce anyway, so a browser that is wrong by two
 * seconds costs nothing; the lockout **is** the fact, and a browser that counts
 * it down to zero invites an operator to try again into a refusal. This hook
 * takes a deadline it is allowed to be approximately right about. Lockout takes
 * `t.plural('auth.lockout.retryIn', { minutes })` and no hook at all.
 *
 * ## Why a deadline and not a duration
 *
 * A `setInterval` started at mount with `secondsLeft = 30` and decremented is
 * wrong in three ordinary situations: a backgrounded tab (browsers throttle
 * timers to roughly once a minute, so it resumes showing a stale number), a
 * laptop that slept, and a component that remounted. Deriving the number from
 * `deadline − now` on every tick makes all three impossible rather than handled:
 * the count is a **function of the wall clock**, and a missed tick loses a
 * render, not a second.
 *
 * ## What it is built on
 *
 * `useTick` / `useNow`, unchanged. AC-28 forbids a per-page `setInterval` and
 * `useTick` is the one heartbeat; `useNow(1)` re-reads the clock on it. This
 * hook is composition, not a rival clock — it holds no timer of its own and
 * `Date.now()` does not appear in it. It also gates on `enabled` and stops
 * subscribing once the number can no longer change, so a verify card sitting
 * open after its cooldown expired does not re-render at 1 Hz for the rest of the
 * shift.
 */

import { useEffect, useRef, useState } from 'react'
import { useAnnounce } from './useAnnounce'
import { useNow } from './useTick'
import { toDate } from '@/lib/format/date'
import type { IsoDateTime } from '@/data/types/common'

const MS_PER_SECOND = 1_000

/**
 * Whole seconds from `now` to `deadline`, never negative.
 *
 * **Ceiling, not rounding.** At 0.4 s left the control is still locked, and a
 * label reading `Resend code in 0s` beside a disabled button is a bug an
 * operator will click at. It reaches `0` exactly when the deadline passes.
 *
 * Pure and exported so the arithmetic is testable without a renderer.
 */
export function secondsUntil(deadline: IsoDateTime, now: IsoDateTime): number {
  const remainingMs = toDate(deadline).getTime() - toDate(now).getTime()
  return remainingMs <= 0 ? 0 : Math.ceil(remainingMs / MS_PER_SECOND)
}

export interface UseCooldownOptions {
  /**
   * The instant the control re-enables, **as the server issued it**. `null` when
   * no cooldown is running — a challenge that has just opened, or one whose
   * resends are exhausted and whose button has been replaced entirely.
   */
  deadline: IsoDateTime | null
  /**
   * The **finished, translated** sentence announced once when the control
   * re-enables — `t('auth.otp.resendReady')`, `Resend code is available.`
   * Never a key and never a concatenation (AC-74, AC-75). Omit it and nothing
   * is announced.
   */
  readyMessage?: string
  /**
   * `false` for a surface that is not on the current route (AC-28). Nothing
   * ticks and nothing is announced.
   */
  enabled?: boolean
}

export interface Cooldown {
  /** Whole seconds left. `0` whenever the control is usable. */
  secondsRemaining: number
  /** Whether the control may be pressed. `deadline === null` counts as ready. */
  isReady: boolean
  /**
   * Spread onto the element that renders the ticking number.
   *
   * **§4.4: `aria-live="off"`, and this is not optional.** A number that
   * changes every second inside a polite region makes the screen reader read
   * `Resend code in 29 seconds… Resend code in 28 seconds…` over whatever the
   * operator was actually doing, which is worse than silence. The **one**
   * announcement the design allows is `readyMessage`, fired once on the
   * transition, through the app's single live region.
   */
  tickerProps: { readonly 'aria-live': 'off' }
}

const TICKER_PROPS = Object.freeze({ 'aria-live': 'off' } as const)

export function useCooldown(options: UseCooldownOptions): Cooldown {
  const { deadline, readyMessage, enabled = true } = options
  const announce = useAnnounce()

  /* The deadline already counted to zero. Holding the deadline itself rather
     than a boolean is what makes a freshly issued one start counting again
     without an explicit reset. */
  const [settled, setSettled] = useState<IsoDateTime | null>(null)
  /* The deadline we have actually watched tick. A deadline that was already in
     the past when this mounted never "re-enabled" anything, so it must not
     announce — an operator returning to a tab does not need to be told that a
     button they can already see is enabled. */
  const observed = useRef<IsoDateTime | null>(null)

  const counting = enabled && deadline !== null && settled !== deadline
  const now = useNow(1, counting)

  const secondsRemaining = counting && deadline !== null ? secondsUntil(deadline, now) : 0

  useEffect(() => {
    if (!counting || deadline === null) return
    if (secondsRemaining > 0) {
      observed.current = deadline
      return
    }
    const reEnabled = observed.current === deadline
    setSettled(deadline)
    if (reEnabled && readyMessage !== undefined) announce(readyMessage)
  }, [counting, deadline, secondsRemaining, readyMessage, announce])

  return { secondsRemaining, isReady: secondsRemaining === 0, tickerProps: TICKER_PROPS }
}
