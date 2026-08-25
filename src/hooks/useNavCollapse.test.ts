import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryStore, resetDefaultUiStores } from '@/lib/persistence'
import { useNavCollapse } from './useNavCollapse'

afterEach(() => resetDefaultUiStores())

const narrow = () => false
const wide = () => true

describe('first run — AC-32', () => {
  it('defaults to collapsed below the breakpoint', () => {
    const { result } = renderHook(() =>
      useNavCollapse({ store: createMemoryStore<boolean>(), isWide: narrow }),
    )
    expect(result.current.collapsed).toBe(true)
  })

  it('defaults to expanded at or above the breakpoint', () => {
    const { result } = renderHook(() =>
      useNavCollapse({ store: createMemoryStore<boolean>(), isWide: wide }),
    )
    expect(result.current.collapsed).toBe(false)
  })

  it('reads the viewport exactly once, not on every render', () => {
    const isWide = vi.fn(() => true)
    const { rerender } = renderHook(() => useNavCollapse({ store: createMemoryStore<boolean>(), isWide }))
    rerender()
    rerender()
    expect(isWide).toHaveBeenCalledTimes(1)
  })

  it('prefers a stored choice over the viewport, including a stored `false`', () => {
    // The reason the store returns `null` rather than a default: a stored
    // "expanded" at 1280 must beat the narrow default.
    const store = createMemoryStore<boolean>()
    store.write(false)
    const { result } = renderHook(() => useNavCollapse({ store, isWide: narrow }))
    expect(result.current.collapsed).toBe(false)
  })
})

describe('never re-derived from a resize — §3.3, the one thing not to get wrong', () => {
  it('does not change when the window is resized across the breakpoint', () => {
    let isWideNow = true
    const { result, rerender } = renderHook(() =>
      useNavCollapse({ store: createMemoryStore<boolean>(), isWide: () => isWideNow }),
    )
    expect(result.current.collapsed).toBe(false)

    // The operator drags the window narrow, mid-task.
    isWideNow = false
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })
    rerender()
    expect(result.current.collapsed).toBe(false)
  })

  it('registers no resize or matchMedia listener at all', () => {
    const addListener = vi.spyOn(window, 'addEventListener')
    renderHook(() => useNavCollapse({ store: createMemoryStore<boolean>(), isWide: wide }))
    const listened = addListener.mock.calls.map(([type]) => type)
    expect(listened).not.toContain('resize')
    expect(listened).not.toContain('orientationchange')
    addListener.mockRestore()
  })

  it('keeps an explicit collapse when the viewport later says wide', () => {
    let isWideNow = false
    const { result, rerender } = renderHook(() =>
      useNavCollapse({ store: createMemoryStore<boolean>(), isWide: () => isWideNow }),
    )
    act(() => result.current.setCollapsed(false))
    isWideNow = true
    rerender()
    expect(result.current.collapsed).toBe(false)
  })
})

describe('the operator´s toggle', () => {
  it('toggles both ways', () => {
    const { result } = renderHook(() =>
      useNavCollapse({ store: createMemoryStore<boolean>(), isWide: wide }),
    )
    act(() => result.current.toggle())
    expect(result.current.collapsed).toBe(true)
    act(() => result.current.toggle())
    expect(result.current.collapsed).toBe(false)
  })

  it('sets an explicit value', () => {
    const { result } = renderHook(() =>
      useNavCollapse({ store: createMemoryStore<boolean>(), isWide: wide }),
    )
    act(() => result.current.setCollapsed(true))
    expect(result.current.collapsed).toBe(true)
  })
})

describe('persistence — the recorded AC-33 gap', () => {
  it('survives a route change, because the store outlives the component', () => {
    // AC-32´s second clause: "persists across every route".
    const store = createMemoryStore<boolean>()
    const first = renderHook(() => useNavCollapse({ store, isWide: wide }))
    act(() => first.result.current.toggle())
    first.unmount()

    const second = renderHook(() => useNavCollapse({ store, isWide: wide }))
    expect(second.result.current.collapsed).toBe(true)
  })

  it('does NOT survive a reload — AC-33 fails until Q1 is answered', () => {
    // Stated as a test rather than left to be discovered. A fresh store is what
    // a reload produces; when Q1 lands, this test changes and AC-33 passes.
    const beforeReload = createMemoryStore<boolean>()
    const first = renderHook(() => useNavCollapse({ store: beforeReload, isWide: wide }))
    act(() => first.result.current.toggle())
    expect(beforeReload.read()).toBe(true)

    const afterReload = createMemoryStore<boolean>()
    const second = renderHook(() => useNavCollapse({ store: afterReload, isWide: wide }))
    expect(second.result.current.collapsed).toBe(false)
  })

  it('shares one value between the rail and the sub-tab column by default', () => {
    const rail = renderHook(() => useNavCollapse({ isWide: wide }))
    act(() => rail.result.current.toggle())
    const column = renderHook(() => useNavCollapse({ isWide: wide }))
    expect(column.result.current.collapsed).toBe(true)
  })
})
