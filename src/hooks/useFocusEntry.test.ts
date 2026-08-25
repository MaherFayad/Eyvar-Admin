import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useFocusEntry } from './useFocusEntry'
import { useRovingFocus } from './useRovingFocus'

afterEach(() => {
  document.body.innerHTML = ''
})

function buildLayer(): { opener: HTMLButtonElement; layer: HTMLDivElement; inside: HTMLButtonElement } {
  const opener = document.createElement('button')
  opener.textContent = 'Open profile'
  const layer = document.createElement('div')
  layer.tabIndex = -1
  const inside = document.createElement('button')
  inside.textContent = 'Close'
  layer.appendChild(inside)
  document.body.append(opener, layer)
  return { opener, layer, inside }
}

describe('useFocusEntry — AC-67, moves focus in and does NOT trap it', () => {
  it('moves focus into the layer on open', () => {
    const { opener, layer } = buildLayer()
    opener.focus()
    renderHook(({ active }: { active: boolean }) => useFocusEntry({ active, containerRef: { current: layer } }), {
      initialProps: { active: true },
    })
    expect(document.activeElement).toBe(layer)
  })

  it('focuses a named initial control when one is given', () => {
    const { opener, layer, inside } = buildLayer()
    opener.focus()
    renderHook(() =>
      useFocusEntry({ active: true, containerRef: { current: layer }, initialFocusRef: { current: inside } }),
    )
    expect(document.activeElement).toBe(inside)
  })

  it('returns focus to the control that opened it — AC-66, AC-67', () => {
    const { opener, layer } = buildLayer()
    opener.focus()
    const { rerender } = renderHook(
      ({ active }: { active: boolean }) => useFocusEntry({ active, containerRef: { current: layer } }),
      { initialProps: { active: true } },
    )
    expect(document.activeElement).toBe(layer)
    rerender({ active: false })
    expect(document.activeElement).toBe(opener)
  })

  it('installs no keydown or focusin listener — a trap is exactly what §7.3.3 forbids', () => {
    const { opener, layer } = buildLayer()
    opener.focus()
    const before = document.addEventListener
    const types: string[] = []
    document.addEventListener = ((type: string, ...rest: unknown[]) => {
      types.push(type)
      return (before as unknown as (...args: unknown[]) => void).call(document, type, ...rest)
    }) as typeof document.addEventListener

    renderHook(() => useFocusEntry({ active: true, containerRef: { current: layer } }))
    document.addEventListener = before

    expect(types).not.toContain('keydown')
    expect(types).not.toContain('focusin')
    expect(types).not.toContain('focusout')
  })

  it('leaves focus wherever the operator moved it after entry — no trap, by construction', () => {
    const { opener, layer } = buildLayer()
    const behind = document.createElement('button')
    document.body.appendChild(behind)
    opener.focus()
    renderHook(() => useFocusEntry({ active: true, containerRef: { current: layer } }))

    // Tabbing past the layer's last control lands on the page behind it...
    behind.focus()
    expect(document.activeElement).toBe(behind)
    // ...and nothing yanks it back.
    expect(document.activeElement).toBe(behind)
  })

  it('does not focus anything while inactive', () => {
    const { opener, layer } = buildLayer()
    opener.focus()
    renderHook(() => useFocusEntry({ active: false, containerRef: { current: layer } }))
    expect(document.activeElement).toBe(opener)
  })

  it('does not restore focus to an opener that was unmounted meanwhile', () => {
    const { opener, layer } = buildLayer()
    opener.focus()
    const { rerender } = renderHook(
      ({ active }: { active: boolean }) => useFocusEntry({ active, containerRef: { current: layer } }),
      { initialProps: { active: true } },
    )
    opener.remove()
    expect(() => rerender({ active: false })).not.toThrow()
  })

  it('skips the restore when the caller asks it to', () => {
    const { opener, layer } = buildLayer()
    opener.focus()
    const { rerender } = renderHook(
      ({ active }: { active: boolean }) =>
        useFocusEntry({ active, containerRef: { current: layer }, restoreFocus: false }),
      { initialProps: { active: true } },
    )
    rerender({ active: false })
    expect(document.activeElement).toBe(layer)
  })
})

/* ─────────────────────────── roving tabindex ─────────────────────────── */

function buildList(count: number): HTMLElement {
  const container = document.createElement('div')
  for (let i = 0; i < count; i += 1) {
    const item = document.createElement('button')
    item.setAttribute('data-roving-item', '')
    item.textContent = `Item ${i}`
    container.appendChild(item)
  }
  document.body.appendChild(container)
  return container
}

describe('useRovingFocus — AC-64', () => {
  it('puts exactly one item in the tab order', () => {
    const { result } = renderHook(() => useRovingFocus({ itemCount: 5 }))
    const tabIndexes = [0, 1, 2, 3, 4].map((i) => result.current.itemProps(i).tabIndex)
    expect(tabIndexes.filter((t) => t === 0)).toHaveLength(1)
    expect(tabIndexes[0]).toBe(0)
  })

  it('moves down and up a vertical list with the arrow keys', () => {
    const container = buildList(3)
    const { result } = renderHook(() => useRovingFocus({ itemCount: 3 }))
    act(() => result.current.containerRef(container))

    const press = (key: string) =>
      act(() =>
        result.current
          .itemProps(result.current.activeIndex)
          .onKeyDown({ key, preventDefault: () => undefined } as never),
      )

    press('ArrowDown')
    expect(result.current.activeIndex).toBe(1)
    press('ArrowUp')
    expect(result.current.activeIndex).toBe(0)
  })

  it('actually moves DOM focus, not just an index', () => {
    const container = buildList(3)
    const { result } = renderHook(() => useRovingFocus({ itemCount: 3 }))
    act(() => result.current.containerRef(container))
    act(() => result.current.setActiveIndex(2))
    expect(document.activeElement).toBe(container.children[2])
  })

  it('wraps at both ends when looping', () => {
    const container = buildList(3)
    const { result } = renderHook(() => useRovingFocus({ itemCount: 3, loop: true }))
    act(() => result.current.containerRef(container))
    const press = (key: string) =>
      act(() =>
        result.current
          .itemProps(result.current.activeIndex)
          .onKeyDown({ key, preventDefault: () => undefined } as never),
      )

    press('ArrowUp')
    expect(result.current.activeIndex).toBe(2)
    press('ArrowDown')
    expect(result.current.activeIndex).toBe(0)
  })

  it('stops at both ends when not looping', () => {
    const container = buildList(3)
    const { result } = renderHook(() => useRovingFocus({ itemCount: 3, loop: false }))
    act(() => result.current.containerRef(container))
    const press = (key: string) =>
      act(() =>
        result.current
          .itemProps(result.current.activeIndex)
          .onKeyDown({ key, preventDefault: () => undefined } as never),
      )

    press('ArrowUp')
    expect(result.current.activeIndex).toBe(0)
    press('End')
    expect(result.current.activeIndex).toBe(2)
    press('ArrowDown')
    expect(result.current.activeIndex).toBe(2)
  })

  it('jumps to the ends with Home and End', () => {
    const container = buildList(5)
    const { result } = renderHook(() => useRovingFocus({ itemCount: 5 }))
    act(() => result.current.containerRef(container))
    const press = (key: string) =>
      act(() =>
        result.current
          .itemProps(result.current.activeIndex)
          .onKeyDown({ key, preventDefault: () => undefined } as never),
      )

    press('End')
    expect(result.current.activeIndex).toBe(4)
    press('Home')
    expect(result.current.activeIndex).toBe(0)
  })

  /* ── the RTL clause ── */

  it('reads ArrowRight as forward in a horizontal ltr list', () => {
    const container = buildList(3)
    const { result } = renderHook(() => useRovingFocus({ itemCount: 3, orientation: 'horizontal', direction: 'ltr' }))
    act(() => result.current.containerRef(container))
    act(() => result.current.itemProps(0).onKeyDown({ key: 'ArrowRight', preventDefault: () => undefined } as never))
    expect(result.current.activeIndex).toBe(1)
  })

  it('reads ArrowLeft as forward in a horizontal rtl list — the end is physically left', () => {
    const container = buildList(3)
    const { result } = renderHook(() => useRovingFocus({ itemCount: 3, orientation: 'horizontal', direction: 'rtl' }))
    act(() => result.current.containerRef(container))
    act(() => result.current.itemProps(0).onKeyDown({ key: 'ArrowLeft', preventDefault: () => undefined } as never))
    expect(result.current.activeIndex).toBe(1)
  })

  it('does not flip a vertical list in Arabic — down is down in every language', () => {
    const container = buildList(3)
    const { result } = renderHook(() => useRovingFocus({ itemCount: 3, orientation: 'vertical', direction: 'rtl' }))
    act(() => result.current.containerRef(container))
    act(() => result.current.itemProps(0).onKeyDown({ key: 'ArrowDown', preventDefault: () => undefined } as never))
    expect(result.current.activeIndex).toBe(1)
  })

  /* ── edge cases ── */

  it('survives an empty list', () => {
    const { result } = renderHook(() => useRovingFocus({ itemCount: 0 }))
    expect(() =>
      act(() => result.current.itemProps(0).onKeyDown({ key: 'ArrowDown', preventDefault: () => undefined } as never)),
    ).not.toThrow()
    expect(result.current.activeIndex).toBe(0)
  })

  it('survives a single-item list', () => {
    const container = buildList(1)
    const { result } = renderHook(() => useRovingFocus({ itemCount: 1 }))
    act(() => result.current.containerRef(container))
    act(() => result.current.itemProps(0).onKeyDown({ key: 'ArrowDown', preventDefault: () => undefined } as never))
    expect(result.current.activeIndex).toBe(0)
  })

  it('ignores keys it does not own, so Tab still leaves the column', () => {
    const container = buildList(3)
    const { result } = renderHook(() => useRovingFocus({ itemCount: 3 }))
    act(() => result.current.containerRef(container))
    for (const key of ['Tab', 'Enter', ' ', 'a', 'Escape']) {
      act(() => result.current.itemProps(0).onKeyDown({ key, preventDefault: () => undefined } as never))
    }
    expect(result.current.activeIndex).toBe(0)
  })

  it('works before a container is attached', () => {
    const { result } = renderHook(() => useRovingFocus({ itemCount: 3 }))
    expect(() => act(() => result.current.setActiveIndex(1))).not.toThrow()
    expect(result.current.activeIndex).toBe(1)
  })
})
