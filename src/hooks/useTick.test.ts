import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EYVAR_NOW, fixedClock } from '@/data/clients'
import { getClockSubscriberCount, getTickCount, resetClock, setClockSource, useNow, useTick } from './useTick'

beforeEach(() => {
  resetClock()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  resetClock()
})

/**
 * One second per `act`, deliberately. Advancing 60 s in a single `act` fires
 * sixty ticks that React then coalesces into one render — correct behaviour, but
 * it hides the per-bucket render counts these tests exist to measure.
 */
const advance = (seconds: number) => {
  for (let i = 0; i < seconds; i += 1) {
    act(() => void vi.advanceTimersByTime(1000))
  }
}

describe('one clock — AC-28', () => {
  it('registers exactly one setInterval however many surfaces subscribe', () => {
    const spy = vi.spyOn(globalThis, 'setInterval')
    renderHook(() => useTick(1))
    renderHook(() => useTick(5))
    renderHook(() => useTick(60))
    expect(spy).toHaveBeenCalledTimes(1)
    expect(getClockSubscriberCount()).toBe(3)
    spy.mockRestore()
  })

  it('registers no interval at all when nothing subscribes', () => {
    const spy = vi.spyOn(globalThis, 'setInterval')
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('clears the interval when the last subscriber unmounts', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearInterval')
    const first = renderHook(() => useTick(1))
    const second = renderHook(() => useTick(1))
    first.unmount()
    expect(clearSpy).not.toHaveBeenCalled()
    second.unmount()
    expect(clearSpy).toHaveBeenCalledTimes(1)
    expect(getClockSubscriberCount()).toBe(0)
    clearSpy.mockRestore()
  })

  it('ticks once a second', () => {
    renderHook(() => useTick(1))
    advance(3)
    expect(getTickCount()).toBe(3)
  })

  /* ── modulo buckets, ported from `:12512`-`:12611` ── */

  it('re-renders a %1 surface every second', () => {
    const render = vi.fn()
    renderHook(() => {
      render()
      return useTick(1)
    })
    render.mockClear()
    advance(3)
    expect(render).toHaveBeenCalledTimes(3)
  })

  it('re-renders a %60 surface once a minute, not sixty times', () => {
    const render = vi.fn()
    renderHook(() => {
      render()
      return useTick(60)
    })
    render.mockClear()
    advance(59)
    expect(render).not.toHaveBeenCalled()
    advance(1)
    expect(render).toHaveBeenCalledTimes(1)
  })

  it('gives a %5 surface twelve renders a minute', () => {
    const render = vi.fn()
    renderHook(() => {
      render()
      return useTick(5)
    })
    render.mockClear()
    advance(60)
    expect(render).toHaveBeenCalledTimes(12)
  })

  /* ── "a surface not on the current route performs no render work" ── */

  it('does not subscribe or re-render when disabled', () => {
    const render = vi.fn()
    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => {
        render()
        return useTick(1, enabled)
      },
      { initialProps: { enabled: false } },
    )
    expect(getClockSubscriberCount()).toBe(0)
    render.mockClear()
    advance(10)
    expect(render).not.toHaveBeenCalled()

    rerender({ enabled: true })
    expect(getClockSubscriberCount()).toBe(1)
  })

  it('leaves the interval running for other surfaces when one is disabled', () => {
    renderHook(() => useTick(1, true))
    renderHook(() => useTick(1, false))
    advance(2)
    expect(getTickCount()).toBe(2)
    expect(getClockSubscriberCount()).toBe(1)
  })
})

describe('useNow — the heartbeat reads the data layer´s time source', () => {
  it('returns "now" from the injected clock, never from Date.now', () => {
    setClockSource(fixedClock)
    const { result } = renderHook(() => useNow(1))
    expect(result.current).toBe(EYVAR_NOW)
  })

  it('holds the same instant between ticks of its bucket', () => {
    let calls = 0
    setClockSource(() => `2026-06-25T09:14:${String(calls++).padStart(2, '0')}+03:00`)
    const { result } = renderHook(() => useNow(60))
    const first = result.current
    advance(30)
    expect(result.current).toBe(first)
    advance(30)
    expect(result.current).not.toBe(first)
  })

  it('is frozen entirely when disabled, so an off-route surface reads nothing new', () => {
    const clock = vi.fn(() => EYVAR_NOW)
    setClockSource(clock)
    renderHook(() => useNow(1, false))
    clock.mockClear()
    advance(10)
    expect(clock).not.toHaveBeenCalled()
  })
})
