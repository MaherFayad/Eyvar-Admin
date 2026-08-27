import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EYVAR_NOW } from '@/data/clients'
import { currentAnnouncement, getLiveRegion, resetAnnouncer } from '@/lib/a11y/announcer'
import { getClockSubscriberCount, resetClock, setClockSource } from './useTick'
import { secondsUntil, useCooldown } from './useCooldown'

/**
 * A wall clock the test drives, because the whole point of this hook is that
 * the number is a function of the clock rather than of how many ticks fired.
 * `advance` moves the clock **and** the timers together for the normal case;
 * `backgroundFor` moves the clock while firing only one tick, which is what a
 * throttled background tab actually does.
 */
let nowMs = 0

const clockIso = (): string => new Date(nowMs).toISOString()

/**
 * A deadline `n` seconds from the clock's current position.
 *
 * **Always hoist this out of the render callback.** `renderHook(() =>
 * useCooldown({ deadline: at(120) }))` re-evaluates it on every render, so the
 * deadline runs away from the clock and the countdown never moves — which looks
 * exactly like the hook being broken.
 */
const at = (secondsFromStart: number): string => new Date(nowMs + secondsFromStart * 1000).toISOString()

beforeEach(() => {
  resetClock()
  resetAnnouncer()
  vi.useFakeTimers()
  nowMs = Date.parse(EYVAR_NOW)
  setClockSource(clockIso)
})

afterEach(() => {
  vi.useRealTimers()
  resetClock()
  resetAnnouncer()
})

/** One real second: the clock moves and the heartbeat fires, as in a live tab. */
const advance = (seconds: number) => {
  for (let i = 0; i < seconds; i += 1) {
    nowMs += 1000
    act(() => void vi.advanceTimersByTime(1000))
  }
}

/**
 * A backgrounded tab: `n` seconds of wall clock pass, and the browser delivers
 * **one** tick when it comes back. A hook that decremented a local counter would
 * be `n - 1` seconds behind here; one that derives from the deadline is exact.
 */
const backgroundFor = (seconds: number) => {
  nowMs += seconds * 1000
  act(() => void vi.advanceTimersByTime(1000))
}

/** The announcer defers one task so the region mutates; flush it. */
const flushAnnouncement = () => act(() => void vi.advanceTimersByTime(1))

describe('secondsUntil — the pure arithmetic', () => {
  it('counts whole seconds down to the deadline', () => {
    const now = '2026-06-25T09:14:00+03:00'
    expect(secondsUntil('2026-06-25T09:14:30+03:00', now)).toBe(30)
    expect(secondsUntil('2026-06-25T09:16:00+03:00', now)).toBe(120)
  })

  it('ceils, so a locked control never reads 0s', () => {
    const now = '2026-06-25T09:14:00.000+03:00'
    expect(secondsUntil('2026-06-25T09:14:00.400+03:00', now)).toBe(1)
    expect(secondsUntil('2026-06-25T09:14:29.001+03:00', now)).toBe(30)
  })

  it('is 0 at the deadline and stays 0 past it — never negative', () => {
    const now = '2026-06-25T09:14:00+03:00'
    expect(secondsUntil('2026-06-25T09:14:00+03:00', now)).toBe(0)
    expect(secondsUntil('2026-06-25T09:00:00+03:00', now)).toBe(0)
  })

  it('is offset-aware — the same instant written two ways agrees', () => {
    expect(secondsUntil('2026-06-25T06:14:30Z', '2026-06-25T09:14:00+03:00')).toBe(30)
  })

  it('refuses an unparseable deadline rather than counting from NaN', () => {
    expect(() => secondsUntil('soon', EYVAR_NOW)).toThrow()
  })
})

describe('useCooldown — the §4.4 resend cooldown', () => {
  it('counts the 30 s schedule down one second at a time', () => {
    const deadline = at(30)
    const { result } = renderHook(() => useCooldown({ deadline }))

    expect(result.current.secondsRemaining).toBe(30)
    expect(result.current.isReady).toBe(false)

    advance(3)
    expect(result.current.secondsRemaining).toBe(27)

    advance(27)
    expect(result.current.secondsRemaining).toBe(0)
    expect(result.current.isReady).toBe(true)
  })

  it('handles the 60 s and 120 s steps the same way — no schedule lives here', () => {
    const sixtyDeadline = at(60)
    const sixty = renderHook(() => useCooldown({ deadline: sixtyDeadline }))
    expect(sixty.result.current.secondsRemaining).toBe(60)
    sixty.unmount()

    const twoMinuteDeadline = at(120)
    const twoMinutes = renderHook(() => useCooldown({ deadline: twoMinuteDeadline }))
    expect(twoMinutes.result.current.secondsRemaining).toBe(120)
    twoMinutes.unmount()
  })

  it('is ready with no deadline at all', () => {
    const { result } = renderHook(() => useCooldown({ deadline: null }))
    expect(result.current.secondsRemaining).toBe(0)
    expect(result.current.isReady).toBe(true)
  })

  /* The reason the design says "driven off a server-issued deadline". */
  it('shows the right number after a backgrounded tab, not a stale one', () => {
    const deadline = at(120)
    const { result } = renderHook(() => useCooldown({ deadline }))
    advance(2)
    expect(result.current.secondsRemaining).toBe(118)

    backgroundFor(90)
    expect(result.current.secondsRemaining).toBe(28)
  })

  it('is ready when the tab comes back after the deadline passed', () => {
    const deadline = at(30)
    const { result } = renderHook(() => useCooldown({ deadline }))
    advance(1)
    backgroundFor(600)
    expect(result.current.isReady).toBe(true)
    expect(result.current.secondsRemaining).toBe(0)
  })

  it('is ready immediately for a deadline already in the past', () => {
    const deadline = at(-5)
    const { result } = renderHook(() => useCooldown({ deadline }))
    expect(result.current.isReady).toBe(true)
  })

  it('starts counting again when a new deadline is issued', () => {
    const first = at(30)
    const { result, rerender } = renderHook(
      ({ deadline }: { deadline: string | null }) => useCooldown({ deadline }),
      { initialProps: { deadline: first } },
    )
    advance(30)
    expect(result.current.isReady).toBe(true)

    rerender({ deadline: at(60) })
    expect(result.current.secondsRemaining).toBe(60)
    expect(result.current.isReady).toBe(false)
  })

  it('stops subscribing to the clock once the number can no longer change', () => {
    const deadline = at(2)
    const { result } = renderHook(() => useCooldown({ deadline }))
    expect(getClockSubscriberCount()).toBe(1)
    advance(2)
    expect(result.current.isReady).toBe(true)
    /* AC-28's spirit: a verify card left open must not re-render at 1 Hz for
       the rest of the shift with nothing to say. */
    expect(getClockSubscriberCount()).toBe(0)
  })

  it('does not tick at all when the surface is off-route — AC-28', () => {
    const deadline = at(30)
    renderHook(() => useCooldown({ deadline, enabled: false }))
    expect(getClockSubscriberCount()).toBe(0)
  })

  it('unsubscribes on unmount', () => {
    const deadline = at(30)
    const { unmount } = renderHook(() => useCooldown({ deadline }))
    expect(getClockSubscriberCount()).toBe(1)
    unmount()
    expect(getClockSubscriberCount()).toBe(0)
  })
})

describe('useCooldown — the announcement, §4.4', () => {
  it('pins the ticking number to aria-live="off"', () => {
    const deadline = at(30)
    const { result } = renderHook(() => useCooldown({ deadline }))
    /* A per-second polite region is unusable with a screen reader; the design
       says the number is silent and the re-enable speaks once. */
    expect(result.current.tickerProps['aria-live']).toBe('off')
  })

  it('announces exactly once when the control re-enables', () => {
    const deadline = at(3)
    renderHook(() => useCooldown({ deadline, readyMessage: 'Resend code is available.' }))
    advance(2)
    flushAnnouncement()
    expect(currentAnnouncement()).toBe('')

    advance(1)
    flushAnnouncement()
    expect(currentAnnouncement()).toBe('Resend code is available.')
  })

  it('speaks through the one live region, and does not mint a second — AC-29', () => {
    const deadline = at(1)
    renderHook(() => useCooldown({ deadline, readyMessage: 'Resend code is available.' }))
    advance(1)
    flushAnnouncement()
    expect(document.querySelectorAll('[aria-live]')).toHaveLength(1)
    expect(getLiveRegion().getAttribute('aria-live')).toBe('polite')
  })

  it('does not repeat the announcement on later renders', () => {
    const deadline = at(1)
    const { rerender } = renderHook(() =>
      useCooldown({ deadline, readyMessage: 'Resend code is available.' }),
    )
    advance(1)
    flushAnnouncement()
    expect(currentAnnouncement()).toBe('Resend code is available.')

    resetAnnouncer()
    rerender()
    advance(5)
    flushAnnouncement()
    /* Nothing re-enabled a second time, so nothing is said a second time. */
    expect(currentAnnouncement()).toBe('')
  })

  it('says nothing for a deadline that was already past on mount', () => {
    const deadline = at(-10)
    renderHook(() => useCooldown({ deadline, readyMessage: 'Resend code is available.' }))
    advance(2)
    flushAnnouncement()
    /* Nothing re-enabled — the button was already enabled when the operator
       arrived, and telling them so is noise. */
    expect(currentAnnouncement()).toBe('')
  })

  it('says nothing when the deadline is simply removed', () => {
    const { rerender } = renderHook(
      ({ deadline }: { deadline: string | null }) =>
        useCooldown({ deadline, readyMessage: 'Resend code is available.' }),
      { initialProps: { deadline: at(30) as string | null } },
    )
    advance(2)
    rerender({ deadline: null })
    advance(1)
    flushAnnouncement()
    /* `resend-exhausted` replaces the button with `Go to sign in`; announcing
       that a control which no longer exists is available would be a lie. */
    expect(currentAnnouncement()).toBe('')
  })

  it('says nothing when no readyMessage is given', () => {
    const deadline = at(1)
    renderHook(() => useCooldown({ deadline }))
    advance(1)
    flushAnnouncement()
    expect(currentAnnouncement()).toBe('')
  })

  it('announces again for a second cooldown — once per re-enable', () => {
    const { rerender } = renderHook(
      ({ deadline }: { deadline: string | null }) =>
        useCooldown({ deadline, readyMessage: 'Resend code is available.' }),
      { initialProps: { deadline: at(2) as string | null } },
    )
    advance(2)
    flushAnnouncement()
    expect(currentAnnouncement()).toBe('Resend code is available.')

    resetAnnouncer()
    rerender({ deadline: at(2) })
    advance(2)
    flushAnnouncement()
    expect(currentAnnouncement()).toBe('Resend code is available.')
  })

  it('announces nothing while off-route', () => {
    const deadline = at(1)
    renderHook(() =>
      useCooldown({ deadline, readyMessage: 'Resend code is available.', enabled: false }),
    )
    advance(5)
    flushAnnouncement()
    expect(currentAnnouncement()).toBe('')
  })
})
