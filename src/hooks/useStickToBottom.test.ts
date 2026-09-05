import { act, fireEvent, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { STICK_TO_BOTTOM_THRESHOLD_PX, useStickToBottom } from './useStickToBottom'

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * jsdom lays nothing out, so the three scroll metrics are defined on the
 * element and the test moves them the way a browser would.
 */
function buildScroller(scrollHeight = 1000, clientHeight = 400): HTMLDivElement {
  const el = document.createElement('div')
  Object.defineProperty(el, 'scrollHeight', { value: scrollHeight, writable: true, configurable: true })
  Object.defineProperty(el, 'clientHeight', { value: clientHeight, writable: true, configurable: true })
  Object.defineProperty(el, 'scrollTop', { value: 0, writable: true, configurable: true })
  document.body.append(el)
  return el
}

function grow(el: HTMLElement, by: number): void {
  Object.defineProperty(el, 'scrollHeight', { value: el.scrollHeight + by, writable: true, configurable: true })
}

/** The operator drags the thread so its bottom edge sits `distance` px below the viewport. */
function scrollAway(el: HTMLElement, distance: number): void {
  el.scrollTop = el.scrollHeight - el.clientHeight - distance
  fireEvent.scroll(el)
}

function mount(el: HTMLElement | null) {
  return renderHook(({ count }: { count: number }) => useStickToBottom({ current: el }, [count]), {
    initialProps: { count: 1 },
  })
}

describe('useStickToBottom, design 12 §4.3', () => {
  it('opens scrolled to the bottom', () => {
    const el = buildScroller()
    const { result } = mount(el)
    expect(el.scrollTop).toBe(el.scrollHeight)
    expect(result.current.pinned).toBe(true)
    expect(result.current.pendingCount).toBe(0)
  })

  it('follows a new message while the operator is within the threshold of the bottom', () => {
    const el = buildScroller()
    const { result, rerender } = mount(el)
    act(() => scrollAway(el, STICK_TO_BOTTOM_THRESHOLD_PX))
    expect(result.current.pinned).toBe(true)

    grow(el, 200)
    rerender({ count: 2 })
    expect(el.scrollTop).toBe(el.scrollHeight)
    expect(result.current.pendingCount).toBe(0)
  })

  it('holds the place and counts arrivals once the operator is beyond the threshold', () => {
    const el = buildScroller()
    const { result, rerender } = mount(el)
    act(() => scrollAway(el, STICK_TO_BOTTOM_THRESHOLD_PX + 1))
    expect(result.current.pinned).toBe(false)
    const held = el.scrollTop

    grow(el, 200)
    rerender({ count: 2 })
    grow(el, 200)
    rerender({ count: 3 })
    expect(el.scrollTop).toBe(held)
    expect(result.current.pendingCount).toBe(2)
  })

  it('does not count a re-render whose deps did not change', () => {
    const el = buildScroller()
    const { result, rerender } = mount(el)
    act(() => scrollAway(el, 300))
    rerender({ count: 1 })
    expect(result.current.pendingCount).toBe(0)
  })

  it('pressing the pill scrolls to the bottom, re-pins and clears the count', () => {
    const el = buildScroller()
    const { result, rerender } = mount(el)
    act(() => scrollAway(el, 300))
    grow(el, 200)
    rerender({ count: 2 })
    expect(result.current.pendingCount).toBe(1)

    act(() => result.current.scrollToBottom())
    expect(el.scrollTop).toBe(el.scrollHeight)
    expect(result.current.pinned).toBe(true)
    expect(result.current.pendingCount).toBe(0)

    grow(el, 100)
    rerender({ count: 3 })
    expect(el.scrollTop).toBe(el.scrollHeight)
  })

  it('reaching the bottom by scrolling clears the count too', () => {
    const el = buildScroller()
    const { result, rerender } = mount(el)
    act(() => scrollAway(el, 300))
    grow(el, 200)
    rerender({ count: 2 })
    expect(result.current.pendingCount).toBe(1)

    act(() => scrollAway(el, 0))
    expect(result.current.pinned).toBe(true)
    expect(result.current.pendingCount).toBe(0)
  })

  it('tolerates a container that has not rendered yet', () => {
    const { result, rerender } = mount(null)
    rerender({ count: 2 })
    expect(result.current.pinned).toBe(true)
    expect(result.current.pendingCount).toBe(0)
  })
})
