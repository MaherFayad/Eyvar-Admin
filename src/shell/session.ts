/**
 * The session lifecycle and **the freeze contract** — design §8.1, §8.6;
 * spec §7.1–§7.3.
 *
 * Spec §7.3 calls the freeze *"the most important rule in §7 and the one an
 * implementation will get wrong."* It is worth restating in full, because every
 * decision in this file is one of these lines:
 *
 * ```
 *   session expires
 *        │
 *        ├─ active route CLEAN ────► redirect /signin + an info banner
 *        │                            naming the reason. Nothing is lost.
 *        └─ active route DIRTY ────► FREEZE
 *                                      1. nothing unmounts
 *                                      2. no route change, no reload, no scroll change
 *                                      3. every text input  → readOnly
 *                                      4. every button that mutates → disabled
 *                                      5. every open shell layer → closed
 *                                      6. SaveBar stays up, still reporting `dirty`
 *                                      7. the reauth modal opens
 * ```
 *
 * ## Lifetimes (spec §7.1)
 *
 * | Property | Value | Source |
 * |---|---|---|
 * | Idle timeout | **30 minutes** | `DB.opsConfig.security.sessionTimeoutMin` (`:2572`), clamped 5–240 at `:8027`. Adopted, not invented |
 * | Absolute lifetime | **12 hours**, not extendable by activity | `[inferred]` |
 * | Idle warning | at **2 minutes** remaining | `[inferred]` |
 *
 * The idle number is **configurable** in the product (Admin › Team & Access,
 * wave 7), so it is a parameter here rather than a literal in a comparison.
 *
 * ## Deadlines and two timers — and why there is no heartbeat
 *
 * Everything is derived from `deadline − now`, never from a decremented
 * counter, for the reason `useCooldown`'s header gives: a backgrounded tab, a
 * slept laptop and a remount are all *impossible* against a deadline and all
 * *handled badly* against a countdown.
 *
 * **The session does not subscribe to the clock while it is healthy.** An
 * earlier draft read `useNow(60)` for the whole session, which is a 1 Hz-ish
 * re-render of the entire shell for the twenty-eight minutes in which nothing
 * can possibly change, and **AC-28** — *"exactly one `setInterval` is
 * registered by the application"*, asserted as **none at boot** — caught it.
 * The shape that is both cheaper and more correct:
 *
 * - **two `setTimeout`s**, armed at the two deadlines and re-armed whenever
 *   activity moves the idle one. A timeout at a deadline cannot be wrong about
 *   the time; an interval counting toward one can.
 * - **a 1 s tick, but only inside the two-minute warning**, because that is the
 *   only window whose label changes sub-minute. `useNow(1, warning)` is
 *   subscribed for those two minutes and not one second longer, which is
 *   exactly what AC-28's *"a surface that is not on the current route performs
 *   no render work when the clock ticks"* is about.
 *
 * The *label* still changes only three times, per minute, so §8.6's rule holds:
 * *"per minute, not per second. A per-second live region is unusable with a
 * screen reader, and a per-second visual tick on a standing banner is an
 * ambient loop R18 does not licence."* Sampling frequency and render frequency
 * are different things, and only the second is what R18 governs.
 *
 * ## What this file does NOT do
 *
 * **No client-side lockout counter, and no resend schedule.** `DECISIONS.md`
 * CARRIED item 4: 30/60/120 is server policy and the lockout minutes are
 * re-read per attempt. Neither number appears here.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNow } from '@/hooks'

/** Spec §7.1, adopted from `opsConfig.security.sessionTimeoutMin`. */
export const DEFAULT_IDLE_TIMEOUT_MINUTES = 30
/** Spec §7.1's clamp, `Math.min(240, Math.max(5, …))` at `:8027`. Kept, so the same numbers bind. */
export const MIN_IDLE_TIMEOUT_MINUTES = 5
export const MAX_IDLE_TIMEOUT_MINUTES = 240
/** Spec §7.1 — one shift, and activity does not extend it. */
export const ABSOLUTE_LIFETIME_HOURS = 12
/** Spec §7.1, design §8.6 — the banner appears here and nowhere earlier. */
export const IDLE_WARNING_MINUTES = 2

const MS_PER_MINUTE = 60_000

/** **AC-560** — the reason is shown, and idle is visibly distinct from absolute. */
export type SessionExpiryReason = 'idle' | 'absolute'

export interface SessionLifecycle {
  /**
   * `signed-out` is what makes **AC-501**, **AC-502**, **AC-575** and
   * **AC-658** checkable at all.
   *
   * **It starts `authenticated`, deliberately.** `GET /session` succeeds in
   * mock mode, which models *"the server read the auth cookie and it was
   * valid"* — so the honest default is that an operator opening the console has
   * a session, exactly as they would against a real API. A default of
   * `signed-out` would not be more rigorous; it would be a different lie, and
   * it would make every existing shell test assert its way through a sign-in
   * form that has nothing to do with what it is testing.
   */
  status: 'authenticated' | 'signed-out'
  /**
   * Why the session ended, once it has. Survives the redirect to `/signin` so
   * the card can render §3.2's info banner, and survives into the re-auth modal
   * so **AC-560** can distinguish the two reasons there too.
   */
  endedReason: SessionExpiryReason | null
  /**
   * **Non-null while the console is frozen** (§8.1). Set only when the session
   * expires on a **dirty** route; a clean route redirects instead.
   */
  frozenReason: SessionExpiryReason | null
  /**
   * Whole minutes left in the idle window, once it is ≤ 2. `null` outside the
   * warning. `0` renders `in less than a minute.`
   */
  idleWarningMinutes: number | null
  /** **AC-559** — only this extends the session, and it removes the banner. */
  staySignedIn: () => void
  /** The auth screens call this after a code step produces a session. */
  signedIn: () => void
  /** **AC-575** — ends the session and sends the operator to `/signin`. */
  signOut: (reason?: SessionExpiryReason | null) => void
  /** Re-authentication succeeded: the freeze lifts and the clocks restart. */
  resumed: () => void
  /**
   * Force expiry now. The QA affordance **AC-557** needs — thirty real minutes
   * is not a test — and the two production callers are the timers below.
   */
  expireNow: (reason: SessionExpiryReason) => void
}

export interface UseSessionLifecycleOptions {
  /**
   * Is the active route dirty? Design §8.1's branch. Read as a **function**
   * rather than a value so the expiry path sees the state at the instant it
   * fires rather than the state at the render that armed the timer — a form can
   * go dirty in the last second of the idle window.
   */
  isDirty: () => boolean
  /** Spec §7.1, clamped as the legacy setting is. */
  idleTimeoutMinutes?: number
  /** Called instead of freezing, when the route is clean (§8.1 branch 1). */
  onCleanExpiry: (reason: SessionExpiryReason) => void
  /**
   * §8.1 rule 5 — **every open shell layer closes first**, because a modal may
   * not composite over a drawer (R4-3 §3.2, §5.0). *Form state is preserved;
   * overlay state is not*, and those are different things.
   */
  onFreeze: () => void
}

export function useSessionLifecycle(options: UseSessionLifecycleOptions): SessionLifecycle {
  const idleTimeoutMinutes = clampIdleTimeout(
    options.idleTimeoutMinutes ?? DEFAULT_IDLE_TIMEOUT_MINUTES,
  )

  const [status, setStatus] = useState<'authenticated' | 'signed-out'>('authenticated')
  const [endedReason, setEndedReason] = useState<SessionExpiryReason | null>(null)
  const [frozenReason, setFrozenReason] = useState<SessionExpiryReason | null>(null)
  /** True for the last two minutes of the idle window, and only then. */
  const [warning, setWarning] = useState(false)

  /* Deadlines, not counters. `issuedAt` is only reset by a real sign-in or a
     resume — `Stay signed in` moves the idle deadline and deliberately does NOT
     move this one, because §7.1 says the absolute lifetime is "not extendable
     by activity". */
  const [issuedAt, setIssuedAt] = useState(() => Date.now())
  const [lastActivityAt, setLastActivityAt] = useState(() => Date.now())

  const idleDeadline = lastActivityAt + idleTimeoutMinutes * MS_PER_MINUTE
  const absoluteDeadline = issuedAt + ABSOLUTE_LIFETIME_HOURS * 60 * MS_PER_MINUTE

  const running = status === 'authenticated' && frozenReason === null

  /* `options` is a fresh object every render; holding it in a ref keeps the
     timer effect's dependency list to the three values that actually decide
     when it fires. */
  const optionsRef = useRef(options)
  optionsRef.current = options

  const expireNow = useCallback((reason: SessionExpiryReason) => {
    /* §8.1's branch, read at the INSTANT of expiry. */
    if (optionsRef.current.isDirty()) {
      optionsRef.current.onFreeze()
      setFrozenReason(reason)
      setEndedReason(reason)
      return
    }
    setEndedReason(reason)
    setStatus('signed-out')
    optionsRef.current.onCleanExpiry(reason)
  }, [])

  /* Idle activity. Pointer and keyboard only: a scroll wheel under a resting
     hand is not an operator working, and `mousemove` would make the timeout
     unreachable on any desk with a nudged mouse. Passive and on `document`, so
     no screen has to opt in. */
  const runningRef = useRef(running)
  runningRef.current = running

  useEffect(() => {
    if (typeof document === 'undefined') return
    const bump = () => {
      if (runningRef.current) setLastActivityAt(Date.now())
    }
    const events: (keyof DocumentEventMap)[] = ['pointerdown', 'keydown']
    for (const event of events) document.addEventListener(event, bump, { passive: true })
    return () => {
      for (const event of events) document.removeEventListener(event, bump)
    }
  }, [])

  /**
   * The two timers. Re-armed whenever either deadline moves, which is what
   * makes `Stay signed in` and ordinary activity the same mechanism.
   *
   * **`setTimeout`, not `setInterval`** — see the header. A timeout at a
   * deadline is one scheduled event; an interval toward one is 1,800 wake-ups
   * that can each be wrong.
   */
  useEffect(() => {
    if (!running) return
    const now = Date.now()

    const warningAt = idleDeadline - IDLE_WARNING_MINUTES * MS_PER_MINUTE
    setWarning(now >= warningAt)

    const timers = [
      now >= warningAt ? null : window.setTimeout(() => setWarning(true), warningAt - now),
      window.setTimeout(() => expireNow('idle'), Math.max(0, idleDeadline - now)),
      window.setTimeout(() => expireNow('absolute'), Math.max(0, absoluteDeadline - now)),
    ]
    return () => {
      for (const timer of timers) if (timer !== null) window.clearTimeout(timer)
    }
  }, [running, idleDeadline, absoluteDeadline, expireNow])

  /* The one-second tick, subscribed **only** while the banner is on screen. */
  const tick = useNow(1, warning)
  const idleWarningMinutes = (() => {
    if (!running || !warning) return null
    const remaining = idleDeadline - Date.parse(tick)
    if (remaining <= 0) return null
    /* `ceil` at the minute boundary, so 90 s reads `2 minutes` and 45 s reads
       `1 minute`; below 60 s the value is 0 and the caller renders
       `in less than a minute.` — §8.6's three renders, exactly. */
    return remaining < MS_PER_MINUTE ? 0 : Math.ceil(remaining / MS_PER_MINUTE)
  })()

  const staySignedIn = useCallback(() => {
    /* **AC-559** — this, and only this, extends the window. The banner
       appearing does not, and neither does the countdown reaching 1. */
    setLastActivityAt(Date.now())
  }, [])

  const signedIn = useCallback(() => {
    setStatus('authenticated')
    setEndedReason(null)
    setFrozenReason(null)
    setWarning(false)
    setIssuedAt(Date.now())
    setLastActivityAt(Date.now())
  }, [])

  const signOut = useCallback((reason: SessionExpiryReason | null = null) => {
    setStatus('signed-out')
    setFrozenReason(null)
    setWarning(false)
    setEndedReason(reason)
  }, [])

  const resumed = useCallback(() => {
    setFrozenReason(null)
    setEndedReason(null)
    setWarning(false)
    setIssuedAt(Date.now())
    setLastActivityAt(Date.now())
  }, [])

  return {
    status,
    endedReason,
    frozenReason,
    idleWarningMinutes,
    staySignedIn,
    signedIn,
    signOut,
    resumed,
    expireNow,
  }
}

/** `Math.min(240, Math.max(5, …))` — the legacy clamp at `:8027`, kept verbatim. */
export function clampIdleTimeout(minutes: number): number {
  return Math.min(MAX_IDLE_TIMEOUT_MINUTES, Math.max(MIN_IDLE_TIMEOUT_MINUTES, minutes))
}
