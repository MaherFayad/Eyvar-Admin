/**
 * Roving tabindex for a custom list. **AC-64**:
 *
 * > Arrow keys move focus within the rail and within the sub-tab list; `Tab`
 * > moves between the two columns and then into the content region.
 *
 * Two call sites in the shell — the workspace rail (§2.1) and the sub-tab column
 * (§3.1) — plus the collapsed column's popover list (§3.2), which renders the
 * same rows. `sidebar` was not added (Q6 closed, design spec §0.2), so the rail
 * is built and nothing ships this behaviour for free.
 *
 * Radix owns this for the components it provides — a menu, a radio group, the
 * sort popover's field list. Do not use this hook inside one of those.
 *
 * The RTL clause is the reason `direction` is a parameter rather than an
 * assumption: in a **horizontal** list, `ArrowRight` must move toward the *end*
 * of the list, and in Arabic the end is on the physical left (§9.1 — logical, not
 * physical). A **vertical** list is unaffected; `ArrowDown` is down in every
 * language, which is why the rail and the sub-tab list need no special case.
 */

import { useCallback, useRef, useState, type KeyboardEvent } from 'react'
import type { Direction } from '@/lib/i18n/direction'

export interface UseRovingFocusOptions {
  itemCount: number
  orientation?: 'vertical' | 'horizontal'
  /** Only consulted for a horizontal list. */
  direction?: Direction
  /** Wrap from the last item to the first. Default `true`. */
  loop?: boolean
  initialIndex?: number
}

export interface RovingItemProps {
  /** How the hook finds the item in the DOM. Spread it; do not set it yourself. */
  'data-roving-item': ''
  /** Exactly one item is in the tab order — that is the whole idea. */
  tabIndex: 0 | -1
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
  onFocus: () => void
}

export interface RovingFocus {
  containerRef: (node: HTMLElement | null) => void
  activeIndex: number
  setActiveIndex: (index: number) => void
  itemProps: (index: number) => RovingItemProps
}

export function useRovingFocus(options: UseRovingFocusOptions): RovingFocus {
  const {
    itemCount,
    orientation = 'vertical',
    direction = 'ltr',
    loop = true,
    initialIndex = 0,
  } = options

  const [activeIndex, setActiveIndexState] = useState(initialIndex)
  const containerNodeRef = useRef<HTMLElement | null>(null)

  const containerRef = useCallback((node: HTMLElement | null) => {
    containerNodeRef.current = node
  }, [])

  const focusItem = useCallback((index: number) => {
    setActiveIndexState(index)
    const items = containerNodeRef.current?.querySelectorAll<HTMLElement>('[data-roving-item]')
    items?.item(index)?.focus()
  }, [])

  const move = useCallback(
    (delta: number) => {
      if (itemCount === 0) return
      const raw = activeIndex + delta
      const next = loop
        ? (raw + itemCount) % itemCount
        : Math.min(itemCount - 1, Math.max(0, raw))
      focusItem(next)
    },
    [activeIndex, itemCount, loop, focusItem],
  )

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      const forwardKey = orientation === 'vertical' ? 'ArrowDown' : direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
      const backwardKey = orientation === 'vertical' ? 'ArrowUp' : direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft'

      switch (event.key) {
        case forwardKey:
          event.preventDefault()
          move(1)
          return
        case backwardKey:
          event.preventDefault()
          move(-1)
          return
        case 'Home':
          event.preventDefault()
          focusItem(0)
          return
        case 'End':
          event.preventDefault()
          focusItem(Math.max(0, itemCount - 1))
          return
        default:
      }
    },
    [orientation, direction, move, focusItem, itemCount],
  )

  const itemProps = useCallback(
    (index: number): RovingItemProps => ({
      'data-roving-item': '',
      tabIndex: index === activeIndex ? 0 : -1,
      onKeyDown,
      onFocus: () => setActiveIndexState(index),
    }),
    [activeIndex, onKeyDown],
  )

  return { containerRef, activeIndex, setActiveIndex: focusItem, itemProps }
}
